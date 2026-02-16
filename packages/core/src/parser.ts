/**
 * Parser - Recursive Descent Parser
 * Produces AST from tokens
 */

import { Token, TokenType } from './tokens.js';
import { Lexer } from './lexer.js';
import * as AST from './ast.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public token: Token,
    public expected?: string
  ) {
    super(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private inPipeObjectContext: boolean = false;
  // Stack of arrow function parameter names (for nested arrows)
  // When inside an arrow body, .property resolves to param.property
  private arrowParamStack: string[] = [];

  constructor(private input: string) {}

  parse(): AST.Program {
    const lexer = new Lexer(this.input);
    this.tokens = lexer.tokenize();
    this.current = 0;

    const statements: AST.LetBinding[] = [];
    let expression: AST.Expression | null = null;

    // Parse statements (let/const bindings)
    while (!this.isAtEnd() && (this.check(TokenType.LET) || this.check(TokenType.CONST))) {
      statements.push(this.parseLetBinding());
    }

    // Parse final expression
    if (!this.isAtEnd()) {
      expression = this.parseExpression();
    }

    // Should be at EOF
    if (!this.isAtEnd()) {
      throw new ParseError('Unexpected token after expression', this.peek());
    }

    return {
      type: 'Program',
      statements,
      expression,
    };
  }

  // ===========================================================================
  // STATEMENTS
  // ===========================================================================

  private parseLetBinding(): AST.LetBinding {
    const constant = this.check(TokenType.CONST);
    this.advance(); // consume let/const

    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected variable name');
    this.consume(TokenType.ASSIGN, 'Expected "=" after variable name');
    const value = this.parseExpression();
    this.consume(TokenType.SEMICOLON, 'Expected ";" after variable declaration');

    return {
      type: 'LetBinding',
      name: nameToken.value,
      value,
      constant,
    };
  }

  // ===========================================================================
  // EXPRESSIONS (by precedence, lowest to highest)
  // ===========================================================================

  private parseExpression(): AST.Expression {
    return this.parsePipe();
  }

  // Pipe: value | transform | transform
  // Also supports jq-style property access: value | .field | .[0] | .method()
  // And pipe-to-object/array construction: value | { id: .id } or value | [.id, .name]
  private parsePipe(): AST.Expression {
    let left = this.parseTernary();

    while (this.match(TokenType.PIPE)) {
      // Check if next token is DOT - pipe property access syntax (jq-style)
      if (this.check(TokenType.DOT)) {
        const right = this.parsePipePropertyAccess();
        left = { type: 'PipeExpression', left, right };
      } else if (this.check(TokenType.LBRACKET)) {
        // Could be index access [0] or array construction [.id, .name]
        const right = this.parsePipeArrayOrIndex();
        left = { type: 'PipeExpression', left, right };
      } else if (this.check(TokenType.LBRACE)) {
        // Pipe-to-object construction: value | { .field, newKey: .other }
        const right = this.parsePipeObjectConstruction();
        left = { type: 'PipeExpression', left, right };
      } else {
        const right = this.parseTernary();
        left = { type: 'PipeExpression', left, right };
      }
    }

    return left;
  }

  // Determine if | [...] is array construction or index access
  // Array construction: | [.id, .name] or | [id, name] (shorthand) or | [expr, expr, ...]
  // Index access: | [0] or | [expr] (single non-identifier expression)
  // Spread map: | [*].{ } spreads the pipe value and maps each element
  private parsePipeArrayOrIndex(): AST.Expression {
    // Peek at what follows [
    const afterBracket = this.peekNext(); // token after [

    // If [ is followed by *, it's a spread: | [*] or | [*].{ }
    if (afterBracket.type === TokenType.STAR) {
      return this.parsePipeSpreadAccess();
    }

    // If [ is followed by DOT, it's array construction with pipe context refs: [.id, .name]
    if (afterBracket.type === TokenType.DOT) {
      return this.parsePipeArrayConstruction();
    }

    // If [ is followed by ], it's empty array construction: []
    if (afterBracket.type === TokenType.RBRACKET) {
      return this.parsePipeArrayConstruction();
    }

    // If [ is followed by SPREAD, it's array construction: [...items]
    if (afterBracket.type === TokenType.SPREAD) {
      return this.parsePipeArrayConstruction();
    }

    // If [ is followed by identifier, check if comma follows (array) or ] follows (index)
    // For now, if followed by identifier, treat as array construction (shorthand)
    if (afterBracket.type === TokenType.IDENTIFIER) {
      return this.parsePipeArrayConstruction();
    }

    // Otherwise (number, string, expression), treat as index access
    return this.parsePipeIndexAccess();
  }

  // Parse pipe spread: | [*] or | [*].{ template }
  // Creates SpreadAccess on PipeContextRef, allowing MapTransform via postfix .{ }
  private parsePipeSpreadAccess(): AST.Expression {
    this.advance(); // consume [
    this.advance(); // consume *
    this.consume(TokenType.RBRACKET, 'Expected "]" after "*"');

    let expr: AST.Expression = { type: 'SpreadAccess', object: { type: 'PipeContextRef' } };

    // Allow postfix chaining: [*].{ } for MapTransform, [*].field, etc.
    while (true) {
      if (this.match(TokenType.DOT)) {
        if (expr.type === 'SpreadAccess' && this.match(TokenType.LBRACE)) {
          // [*].{ } — MapTransform
          // Do NOT set inPipeObjectContext here: inside the template,
          // . must resolve to the current map item (CurrentAccess), not the pipe value
          const savedContext = this.inPipeObjectContext;
          this.inPipeObjectContext = false;
          const objectLiteral = this.parseObjectLiteral();
          this.inPipeObjectContext = savedContext;
          expr = {
            type: 'MapTransform',
            array: (expr as any).object,
            template: objectLiteral,
          } as any;
        } else {
          const property = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = {
            type: 'MemberAccess',
            object: expr,
            property: property.value as string,
            optional: false,
          };
        }
      } else if (this.match(TokenType.LBRACKET)) {
        expr = this.parseIndexOrSliceOrFilter(expr, false);
      } else {
        break;
      }
    }

    return expr;
  }

  // Parse pipe-to-object construction: value | { id: .id, name: .name | upper }
  private parsePipeObjectConstruction(): AST.ObjectLiteral {
    const savedContext = this.inPipeObjectContext;
    this.inPipeObjectContext = true;

    this.advance(); // consume {
    const result = this.parseObjectLiteral();

    this.inPipeObjectContext = savedContext;
    return result;
  }

  // Parse pipe-to-array construction: value | [.id, .name] or value | [id, name]
  private parsePipeArrayConstruction(): AST.ArrayLiteral {
    const savedContext = this.inPipeObjectContext;
    this.inPipeObjectContext = true;

    this.advance(); // consume [
    const result = this.parsePipeArrayLiteral();

    this.inPipeObjectContext = savedContext;
    return result;
  }

  // Parse array literal in pipe context - identifiers become pipe context refs
  private parsePipeArrayLiteral(): AST.ArrayLiteral {
    const elements: (AST.Expression | AST.SpreadElement)[] = [];

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.SPREAD)) {
        // Spread in pipe array context: [...] spreads pipe value, [...expr] spreads expr
        if (this.check(TokenType.COMMA) || this.check(TokenType.RBRACKET)) {
          // Bare spread: [...] spreads the pipe context
          elements.push({ type: 'SpreadElement', argument: { type: 'PipeContextRef' } });
        } else {
          const argument = this.parseExpression();
          elements.push({ type: 'SpreadElement', argument });
        }
      } else if (this.match(TokenType.IDENTIFIER)) {
        // Shorthand: identifier in pipe array context becomes .identifier
        const name = this.previous().value;
        elements.push({
          type: 'MemberAccess',
          object: { type: 'PipeContextRef' },
          property: name,
          optional: false,
        });
      } else {
        elements.push(this.parseExpression());
      }

      if (!this.check(TokenType.RBRACKET)) {
        this.consume(TokenType.COMMA, 'Expected "," between elements');
        // Allow trailing comma
        if (this.check(TokenType.RBRACKET)) break;
      }
    }

    this.consume(TokenType.RBRACKET, 'Expected "]" after array literal');
    return { type: 'ArrayLiteral', elements };
  }

  // Parse jq-style pipe property access: .field, .[0], .field.subfield, .method()
  private parsePipePropertyAccess(): AST.Expression {
    // Start with PipeContextRef as the base
    let expr: AST.Expression = { type: 'PipeContextRef' };

    // Must start with DOT
    while (this.check(TokenType.DOT) || this.check(TokenType.LBRACKET)) {
      if (this.match(TokenType.DOT)) {
        // Check for .[index] syntax
        if (this.check(TokenType.LBRACKET)) {
          this.advance(); // consume [
          const index = this.parseExpression();
          this.consume(TokenType.RBRACKET, 'Expected "]"');
          expr = {
            type: 'IndexAccess',
            object: expr,
            index,
            optional: false,
          };
        } else {
          // .field or .method()
          const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = {
            type: 'MemberAccess',
            object: expr,
            property: name.value as string,
            optional: false,
          };
        }
      } else if (this.match(TokenType.LBRACKET)) {
        // [0] or ["key"] without dot prefix
        const index = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected "]"');
        expr = {
          type: 'IndexAccess',
          object: expr,
          index,
          optional: false,
        };
      }

      // Handle method calls: .method()
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ")"');
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
        };
      }
    }

    return expr;
  }

  // Parse pipe index access: | [0] (without dot)
  private parsePipeIndexAccess(): AST.Expression {
    let expr: AST.Expression = { type: 'PipeContextRef' };

    this.advance(); // consume [
    const index = this.parseExpression();
    this.consume(TokenType.RBRACKET, 'Expected "]"');
    expr = {
      type: 'IndexAccess',
      object: expr,
      index,
      optional: false,
    };

    // Allow chaining after: | [0].field or | [0][1]
    while (this.check(TokenType.DOT) || this.check(TokenType.LBRACKET)) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.LBRACKET)) {
          this.advance();
          const idx = this.parseExpression();
          this.consume(TokenType.RBRACKET, 'Expected "]"');
          expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
        } else {
          const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = {
            type: 'MemberAccess',
            object: expr,
            property: name.value as string,
            optional: false,
          };
        }
      } else if (this.match(TokenType.LBRACKET)) {
        const idx = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected "]"');
        expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
      }

      // Handle method calls
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ")"');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      }
    }

    return expr;
  }

  // Parse .field access inside pipe object context (DOT already consumed)
  // Returns PipeContextRef-based expression: .field, .[0], .field.nested
  private parsePipeContextAccess(): AST.Expression {
    let expr: AST.Expression = { type: 'PipeContextRef' };

    // Check for .[index] syntax
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // consume [
      const index = this.parseExpression();
      this.consume(TokenType.RBRACKET, 'Expected "]"');
      expr = { type: 'IndexAccess', object: expr, index, optional: false };
    } else if (this.check(TokenType.IDENTIFIER)) {
      // .field
      const name = this.advance();
      expr = {
        type: 'MemberAccess',
        object: expr,
        property: name.value as string,
        optional: false,
      };
    } else {
      // Just . by itself - return the pipe context
      return expr;
    }

    // Allow chaining: .field.nested, .field[0], .field.method()
    while (this.check(TokenType.DOT) || this.check(TokenType.LBRACKET)) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.LBRACKET)) {
          this.advance();
          const idx = this.parseExpression();
          this.consume(TokenType.RBRACKET, 'Expected "]"');
          expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
        } else {
          const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = {
            type: 'MemberAccess',
            object: expr,
            property: name.value as string,
            optional: false,
          };
        }
      } else if (this.match(TokenType.LBRACKET)) {
        const idx = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected "]"');
        expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
      }

      // Handle method calls: .method()
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ")"');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      }
    }

    return expr;
  }

  // Parse .field access inside arrow function body (DOT already consumed)
  // Returns param-based expression: .field becomes param.field, .[0] becomes param[0]
  private parseArrowContextAccess(): AST.Expression {
    const paramName = this.arrowParamStack[this.arrowParamStack.length - 1];
    let expr: AST.Expression = { type: 'Identifier', name: paramName };

    // Check for .[index] syntax
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // consume [
      const index = this.parseExpression();
      this.consume(TokenType.RBRACKET, 'Expected "]"');
      expr = { type: 'IndexAccess', object: expr, index, optional: false };
    } else if (this.check(TokenType.IDENTIFIER)) {
      // .field
      const name = this.advance();
      expr = {
        type: 'MemberAccess',
        object: expr,
        property: name.value as string,
        optional: false,
      };
    } else {
      // Just . by itself - return the parameter identifier
      return expr;
    }

    // Allow chaining: .field.nested, .field[0], .field.method()
    while (this.check(TokenType.DOT) || this.check(TokenType.LBRACKET)) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.LBRACKET)) {
          this.advance();
          const idx = this.parseExpression();
          this.consume(TokenType.RBRACKET, 'Expected "]"');
          expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
        } else {
          const name = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = {
            type: 'MemberAccess',
            object: expr,
            property: name.value as string,
            optional: false,
          };
        }
      } else if (this.match(TokenType.LBRACKET)) {
        const idx = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected "]"');
        expr = { type: 'IndexAccess', object: expr, index: idx, optional: false };
      }

      // Handle method calls: .method()
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ")"');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      }
    }

    return expr;
  }

  // Ternary: condition ? then : else
  private parseTernary(): AST.Expression {
    const test = this.parseLogicalOr();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseExpression();
      this.consume(TokenType.COLON, 'Expected ":" in ternary expression');
      const alternate = this.parseTernary();
      return {
        type: 'TernaryExpression',
        test,
        consequent,
        alternate,
      };
    }

    return test;
  }

  // Logical OR: a || b, a or b
  private parseLogicalOr(): AST.Expression {
    let left = this.parseLogicalAnd();

    while (this.match(TokenType.OR_OR) || this.match(TokenType.OR)) {
      const _operator = this.previous().value;
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryExpression', operator: '||', left, right };
    }

    return left;
  }

  // Logical AND: a && b, a and b
  private parseLogicalAnd(): AST.Expression {
    let left = this.parseEquality();

    while (this.match(TokenType.AND_AND) || this.match(TokenType.AND)) {
      const _operator = this.previous().value;
      const right = this.parseEquality();
      left = { type: 'BinaryExpression', operator: '&&', left, right };
    }

    return left;
  }

  // Equality: a == b, a != b
  private parseEquality(): AST.Expression {
    let left = this.parseComparison();

    while (
      this.match(TokenType.EQ) ||
      this.match(TokenType.NEQ) ||
      this.match(TokenType.STRICT_EQ) ||
      this.match(TokenType.STRICT_NEQ)
    ) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  // Comparison: a < b, a >= b, a in b
  private parseComparison(): AST.Expression {
    let left = this.parseNullCoalesce();

    while (
      this.match(TokenType.LT) ||
      this.match(TokenType.GT) ||
      this.match(TokenType.LTE) ||
      this.match(TokenType.GTE) ||
      this.match(TokenType.IN)
    ) {
      const operator = this.previous().value;
      const right = this.parseNullCoalesce();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  // Null coalescing: a ?? b
  private parseNullCoalesce(): AST.Expression {
    let left = this.parseAdditive();

    while (this.match(TokenType.QUESTION_QUESTION)) {
      const right = this.parseAdditive();
      left = { type: 'NullCoalesce', left, right };
    }

    return left;
  }

  // Addition/Subtraction/Concatenation: a + b, a - b, a & b
  private parseAdditive(): AST.Expression {
    let left = this.parseMultiplicative();

    while (
      this.match(TokenType.PLUS) ||
      this.match(TokenType.MINUS) ||
      this.match(TokenType.AMPERSAND)
    ) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  // Multiplication/Division: a * b, a / b, a % b
  private parseMultiplicative(): AST.Expression {
    let left = this.parseUnary();

    while (
      this.match(TokenType.STAR) ||
      this.match(TokenType.SLASH) ||
      this.match(TokenType.PERCENT)
    ) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  // Unary: !a, -a, +a, not a
  private parseUnary(): AST.Expression {
    if (
      this.match(TokenType.BANG) ||
      this.match(TokenType.MINUS) ||
      this.match(TokenType.PLUS) ||
      this.match(TokenType.NOT)
    ) {
      const operator = this.previous().value;
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument, prefix: true };
    }

    return this.parsePostfix();
  }

  // Postfix: member access, index, call, etc.
  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        // Special case: [*].{ } for array mapping with object construction
        if (expr.type === 'SpreadAccess' && this.match(TokenType.LBRACE)) {
          const objectLiteral = this.parseObjectLiteral();
          expr = { type: 'MapTransform', array: expr.object, template: objectLiteral } as any;
        } else {
          const property = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
          expr = { type: 'MemberAccess', object: expr, property: property.value, optional: false };
        }
      } else if (this.match(TokenType.QUESTION_DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, 'Expected property name after "?."');
        expr = { type: 'MemberAccess', object: expr, property: property.value, optional: true };
      } else if (this.match(TokenType.LBRACKET)) {
        expr = this.parseIndexOrSliceOrFilter(expr, false);
      } else if (this.match(TokenType.QUESTION_BRACKET)) {
        expr = this.parseIndexOrSliceOrFilter(expr, true);
      } else if (this.match(TokenType.LPAREN)) {
        expr = this.parseCallExpression(expr);
      } else if (this.match(TokenType.BANG)) {
        // Non-null assertion
        expr = { type: 'NonNullAssertion', expression: expr };
      } else if (this.match(TokenType.AS)) {
        const typeAnnotation = this.parseTypeAnnotation();
        expr = { type: 'TypeAssertion', expression: expr, typeAnnotation };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseIndexOrSliceOrFilter(object: AST.Expression, optional: boolean): AST.Expression {
    // Check for spread: [*]
    if (this.match(TokenType.STAR)) {
      this.consume(TokenType.RBRACKET, 'Expected "]" after "*"');
      return { type: 'SpreadAccess', object };
    }

    // Check for empty brackets [] - shorthand for [*]
    if (this.match(TokenType.RBRACKET)) {
      return { type: 'SpreadAccess', object };
    }

    // Check for filter: [? predicate] or just [predicate] where predicate is boolean
    if (this.match(TokenType.QUESTION)) {
      const predicate = this.parseExpression();
      this.consume(TokenType.RBRACKET, 'Expected "]" after filter predicate');
      return { type: 'FilterAccess', object, predicate };
    }

    // Check for slice: [start:end]
    let start: AST.Expression | null = null;

    if (!this.check(TokenType.COLON) && !this.check(TokenType.RBRACKET)) {
      start = this.parseExpression();
    }

    if (this.match(TokenType.COLON)) {
      let end: AST.Expression | null = null;
      if (!this.check(TokenType.RBRACKET)) {
        end = this.parseExpression();
      }
      this.consume(TokenType.RBRACKET, 'Expected "]" after slice');
      return { type: 'SliceAccess', object, sliceStart: start, sliceEnd: end };
    }

    // Regular index access
    this.consume(TokenType.RBRACKET, 'Expected "]" after index');
    if (!start) {
      // Safety fallback - shouldn't reach here since [] is handled above
      return { type: 'SpreadAccess', object };
    }
    return { type: 'IndexAccess', object, index: start, optional };
  }

  private parseCallExpression(callee: AST.Expression): AST.CallExpression {
    const args: AST.Expression[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, 'Expected ")" after arguments');

    return { type: 'CallExpression', callee, arguments: args };
  }

  // ===========================================================================
  // PRIMARY EXPRESSIONS
  // ===========================================================================

  private parsePrimary(): AST.Expression {
    // Literals
    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: parseFloat(this.previous().value) };
    }

    if (this.match(TokenType.STRING)) {
      return { type: 'StringLiteral', value: this.previous().value };
    }

    if (this.match(TokenType.TEMPLATE_STRING)) {
      return this.parseTemplateLiteral(this.previous().value);
    }

    if (this.match(TokenType.TRUE)) {
      return { type: 'BooleanLiteral', value: true };
    }

    if (this.match(TokenType.FALSE)) {
      return { type: 'BooleanLiteral', value: false };
    }

    if (this.match(TokenType.NULL)) {
      return { type: 'NullLiteral' };
    }

    if (this.match(TokenType.UNDEFINED)) {
      return { type: 'UndefinedLiteral' };
    }

    // Context access
    if (this.match(TokenType.DOLLAR_DOLLAR)) {
      this.consume(TokenType.DOT, 'Expected "." after "$$"');
      const name = this.consume(TokenType.IDENTIFIER, 'Expected binding name');
      return { type: 'BindingAccess', name: name.value };
    }

    if (this.match(TokenType.DOLLAR)) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.IDENTIFIER)) {
          const name = this.advance();
          return { type: 'RootAccess', path: name.value };
        }
      }
      return { type: 'RootAccess', path: null };
    }

    if (this.match(TokenType.CARET)) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.IDENTIFIER)) {
          const name = this.advance();
          return { type: 'ParentAccess', path: name.value };
        }
      }
      return { type: 'ParentAccess', path: null };
    }

    if (this.match(TokenType.DOT)) {
      // In pipe object context, .field refers to pipe value (PipeContextRef)
      if (this.inPipeObjectContext) {
        return this.parsePipeContextAccess();
      }
      // In arrow function body, .field refers to the first parameter
      // e.g., orders.find(o => .price > 10) means o.price > 10
      if (this.arrowParamStack.length > 0) {
        return this.parseArrowContextAccess();
      }
      // Otherwise, .field refers to current input (CurrentAccess)
      if (this.check(TokenType.IDENTIFIER)) {
        const name = this.advance();
        return { type: 'CurrentAccess', path: name.value };
      }
      return { type: 'CurrentAccess', path: null };
    }

    // Object literal
    if (this.match(TokenType.LBRACE)) {
      return this.parseObjectLiteral();
    }

    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral();
    }

    // If expression
    if (this.match(TokenType.IF)) {
      return this.parseIfExpression();
    }

    // Parenthesized expression or arrow function
    if (this.match(TokenType.LPAREN)) {
      return this.parseParenOrArrow();
    }

    // Identifier (or potential arrow function with single param)
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().value;

      // Check for arrow function: identifier => expr
      if (this.match(TokenType.ARROW)) {
        // Push param to stack so .property inside body resolves to param.property
        this.arrowParamStack.push(name);
        const body = this.parseArrowBody();
        this.arrowParamStack.pop();
        return {
          type: 'ArrowFunction',
          params: [{ type: 'Parameter', name }],
          body,
        };
      }

      return { type: 'Identifier', name };
    }

    throw new ParseError(`Unexpected token: ${this.peek().value}`, this.peek());
  }

  private parseTemplateLiteral(raw: string): AST.TemplateLiteral {
    const parts: (string | AST.Expression)[] = [];
    let current = '';
    let i = 0;

    while (i < raw.length) {
      if (raw[i] === '$' && raw[i + 1] === '{') {
        if (current) {
          parts.push(current);
          current = '';
        }

        // Find matching closing brace
        let braceDepth = 1;
        const exprStart = i + 2;
        let j = exprStart;

        while (j < raw.length && braceDepth > 0) {
          if (raw[j] === '{') braceDepth++;
          if (raw[j] === '}') braceDepth--;
          j++;
        }

        const exprSource = raw.slice(exprStart, j - 1);
        const exprParser = new Parser(exprSource);
        const exprProgram = exprParser.parse();
        if (exprProgram.expression) {
          parts.push(exprProgram.expression);
        }

        i = j;
      } else {
        current += raw[i];
        i++;
      }
    }

    if (current) {
      parts.push(current);
    }

    return { type: 'TemplateLiteral', parts };
  }

  private parseObjectLiteral(): AST.ObjectLiteral {
    const properties: AST.ObjectProperty[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // Spread property: ...expr or just ... (spread pipe context)
      if (this.match(TokenType.SPREAD)) {
        // In pipe context, bare ... spreads the pipe value
        if (
          this.inPipeObjectContext &&
          (this.check(TokenType.COMMA) || this.check(TokenType.RBRACE))
        ) {
          properties.push({ type: 'SpreadProperty', argument: { type: 'PipeContextRef' } });
        } else {
          const argument = this.parseExpression();
          properties.push({ type: 'SpreadProperty', argument });
        }
      }
      // Computed property: [expr]: value
      else if (this.match(TokenType.LBRACKET)) {
        const key = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected "]" after computed property key');
        this.consume(TokenType.COLON, 'Expected ":" after computed property key');
        const value = this.parseExpression();
        properties.push({ type: 'ComputedProperty', key, value });
      }
      // String key or identifier
      else {
        let key: string;

        if (this.match(TokenType.STRING)) {
          key = this.previous().value;
        } else if (this.match(TokenType.IDENTIFIER)) {
          key = this.previous().value;
        } else {
          throw new ParseError('Expected property name', this.peek());
        }

        // Shorthand: { foo } means { foo: foo } in normal context
        // But in pipe context: { foo } means { foo: .foo } (reference pipe value)
        if (!this.check(TokenType.COLON)) {
          if (this.inPipeObjectContext) {
            // In pipe context, expand shorthand to reference pipe value
            properties.push({
              type: 'StandardProperty',
              key,
              value: {
                type: 'MemberAccess',
                object: { type: 'PipeContextRef' },
                property: key,
                optional: false,
              },
            });
          } else {
            properties.push({ type: 'ShorthandProperty', key });
          }
        } else {
          this.consume(TokenType.COLON, 'Expected ":" after property key');
          // Check for inline let/const: key: let name = expr
          if (this.check(TokenType.LET) || this.check(TokenType.CONST)) {
            this.advance(); // consume let/const
            const nameToken = this.consume(
              TokenType.IDENTIFIER,
              'Expected variable name after let/const'
            );
            this.consume(TokenType.ASSIGN, 'Expected "=" after variable name');
            const value = this.parseExpression();
            properties.push({ type: 'InlineLetProperty', key, name: nameToken.value, value });
          } else {
            const value = this.parseExpression();
            properties.push({ type: 'StandardProperty', key, value });
          }
        }
      }

      if (!this.check(TokenType.RBRACE)) {
        this.consume(TokenType.COMMA, 'Expected "," between properties');
        // Allow trailing comma
        if (this.check(TokenType.RBRACE)) break;
      }
    }

    this.consume(TokenType.RBRACE, 'Expected "}" after object literal');
    return { type: 'ObjectLiteral', properties };
  }

  private parseArrayLiteral(): AST.ArrayLiteral {
    const elements: (AST.Expression | AST.SpreadElement)[] = [];

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.SPREAD)) {
        const argument = this.parseExpression();
        elements.push({ type: 'SpreadElement', argument });
      } else {
        elements.push(this.parseExpression());
      }

      if (!this.check(TokenType.RBRACKET)) {
        this.consume(TokenType.COMMA, 'Expected "," between elements');
        // Allow trailing comma
        if (this.check(TokenType.RBRACKET)) break;
      }
    }

    this.consume(TokenType.RBRACKET, 'Expected "]" after array literal');
    return { type: 'ArrayLiteral', elements };
  }

  private parseIfExpression(): AST.IfExpression {
    const conditions: AST.ConditionalBranch[] = [];

    // First condition
    this.consume(TokenType.LPAREN, 'Expected "(" after "if"');
    const firstTest = this.parseExpression();
    this.consume(TokenType.RPAREN, 'Expected ")" after condition');

    let firstConsequent: AST.Expression;
    if (this.match(TokenType.LBRACE)) {
      firstConsequent = this.parseBlockExpression();
    } else {
      firstConsequent = this.parseExpression();
    }

    conditions.push({ type: 'ConditionalBranch', test: firstTest, consequent: firstConsequent });

    // else if / else
    let alternate: AST.Expression | null = null;

    while (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        // else if
        this.consume(TokenType.LPAREN, 'Expected "(" after "else if"');
        const test = this.parseExpression();
        this.consume(TokenType.RPAREN, 'Expected ")" after condition');

        let consequent: AST.Expression;
        if (this.match(TokenType.LBRACE)) {
          consequent = this.parseBlockExpression();
        } else {
          consequent = this.parseExpression();
        }

        conditions.push({ type: 'ConditionalBranch', test, consequent });
      } else {
        // else
        if (this.match(TokenType.LBRACE)) {
          alternate = this.parseBlockExpression();
        } else {
          alternate = this.parseExpression();
        }
        break;
      }
    }

    return { type: 'IfExpression', conditions, alternate };
  }

  private parseBlockExpression(): AST.Expression {
    // For now, just parse a single expression in the block
    const expr = this.parseExpression();
    this.consume(TokenType.RBRACE, 'Expected "}" after block');
    return expr;
  }

  private parseParenOrArrow(): AST.Expression {
    // Could be: (expr), (), (a, b) => expr

    // Empty parens - must be arrow function with no params
    if (this.match(TokenType.RPAREN)) {
      this.consume(TokenType.ARROW, 'Expected "=>" after "()"');
      // No params, so no implicit property access available
      const body = this.parseArrowBody();
      return { type: 'ArrowFunction', params: [], body };
    }

    // Parse first expression
    const first = this.parseExpression();

    // Check for comma - indicates arrow function params
    if (this.match(TokenType.COMMA)) {
      const params: AST.Parameter[] = [this.exprToParam(first)];

      do {
        const param = this.parseExpression();
        params.push(this.exprToParam(param));
      } while (this.match(TokenType.COMMA));

      this.consume(TokenType.RPAREN, 'Expected ")" after parameters');
      this.consume(TokenType.ARROW, 'Expected "=>" after parameters');
      // Push first param to stack so .property inside body resolves to param.property
      this.arrowParamStack.push(params[0].name);
      const body = this.parseArrowBody();
      this.arrowParamStack.pop();
      return { type: 'ArrowFunction', params, body };
    }

    this.consume(TokenType.RPAREN, 'Expected ")"');

    // Check for arrow
    if (this.match(TokenType.ARROW)) {
      const params = [this.exprToParam(first)];
      // Push param to stack so .property inside body resolves to param.property
      this.arrowParamStack.push(params[0].name);
      const body = this.parseArrowBody();
      this.arrowParamStack.pop();
      return { type: 'ArrowFunction', params, body };
    }

    // Just a parenthesized expression
    return first;
  }

  private parseArrowBody(): AST.Expression {
    // Support block body: => { return expr }
    if (this.check(TokenType.LBRACE)) {
      const afterBrace = this.peekNext();
      if (afterBrace.type === TokenType.IDENTIFIER && afterBrace.value === 'return') {
        this.advance(); // consume {
        this.advance(); // consume 'return'
        const expr = this.parseExpression();
        this.consume(TokenType.RBRACE, 'Expected "}" after block body');
        return expr;
      }
    }
    return this.parseExpression();
  }

  private exprToParam(expr: AST.Expression): AST.Parameter {
    if (expr.type === 'Identifier') {
      return { type: 'Parameter', name: expr.name };
    }
    if (expr.type === 'ObjectLiteral') {
      return { type: 'Parameter', name: '', destructure: expr };
    }
    if (expr.type === 'ArrayLiteral') {
      return { type: 'Parameter', name: '', arrayDestructure: expr };
    }
    throw new ParseError('Expected parameter name', this.peek());
  }

  // ===========================================================================
  // TYPE ANNOTATIONS
  // ===========================================================================

  private parseTypeAnnotation(): AST.TypeAnnotation {
    const type = this.parsePrimaryType();

    // Union type: string | number
    if (this.check(TokenType.PIPE)) {
      const types: AST.TypeAnnotation[] = [type];
      while (this.match(TokenType.PIPE)) {
        types.push(this.parsePrimaryType());
      }
      return { type: 'UnionType', types };
    }

    return type;
  }

  private parsePrimaryType(): AST.TypeAnnotation {
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().value;

      // Check for primitive types
      if (['string', 'number', 'boolean', 'null', 'any'].includes(name)) {
        const nonNull = this.match(TokenType.BANG);
        return { type: 'PrimitiveType', name: name as any, nonNull };
      }

      // Array<T>
      if (name === 'Array' && this.match(TokenType.LT)) {
        const elementType = this.parseTypeAnnotation();
        this.consume(TokenType.GT, 'Expected ">" after array element type');
        return { type: 'ArrayType', elementType };
      }

      // Type reference
      return { type: 'TypeReference', name };
    }

    // Object type: { key: type }
    if (this.match(TokenType.LBRACE)) {
      const properties: AST.ObjectTypeProperty[] = [];

      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const key = this.consume(TokenType.IDENTIFIER, 'Expected property name');
        const optional = this.match(TokenType.QUESTION);
        this.consume(TokenType.COLON, 'Expected ":" after property name');
        const valueType = this.parseTypeAnnotation();
        properties.push({ type: 'ObjectTypeProperty', key: key.value, valueType, optional });

        if (!this.check(TokenType.RBRACE)) {
          this.consume(TokenType.COMMA, 'Expected "," between type properties');
        }
      }

      this.consume(TokenType.RBRACE, 'Expected "}" after object type');
      return { type: 'ObjectType', properties };
    }

    throw new ParseError('Expected type annotation', this.peek());
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    if (this.current + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // Return EOF
    }
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek(), TokenType[type]);
  }
}

export function parse(input: string): AST.Program {
  return new Parser(input).parse();
}
