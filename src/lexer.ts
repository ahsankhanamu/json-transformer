/**
 * MapQL Lexer - Tokenizes input string into tokens
 */

import { Token, TokenType, KEYWORDS } from './tokens.js';

export class LexerError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public offset: number
  ) {
    super(`Lexer error at line ${line}, column ${column}: ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      this.scanToken();
    }

    this.tokens.push(this.makeToken(TokenType.EOF, ''));
    return this.tokens;
  }

  private scanToken(): void {
    const char = this.peek();
    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;

    // Multi-character operators first
    if (this.match('...')) {
      this.addToken(TokenType.SPREAD, '...', start, startLine, startColumn);
      return;
    }
    if (this.match('$$')) {
      this.addToken(TokenType.DOLLAR_DOLLAR, '$$', start, startLine, startColumn);
      return;
    }
    if (this.match('?.')) {
      this.addToken(TokenType.QUESTION_DOT, '?.', start, startLine, startColumn);
      return;
    }
    if (this.match('?[')) {
      this.addToken(TokenType.QUESTION_BRACKET, '?[', start, startLine, startColumn);
      return;
    }
    if (this.match('??')) {
      this.addToken(TokenType.QUESTION_QUESTION, '??', start, startLine, startColumn);
      return;
    }
    if (this.match('=>')) {
      this.addToken(TokenType.ARROW, '=>', start, startLine, startColumn);
      return;
    }
    if (this.match('===')) {
      this.addToken(TokenType.STRICT_EQ, '===', start, startLine, startColumn);
      return;
    }
    if (this.match('==')) {
      this.addToken(TokenType.EQ, '==', start, startLine, startColumn);
      return;
    }
    if (this.match('!==')) {
      this.addToken(TokenType.STRICT_NEQ, '!==', start, startLine, startColumn);
      return;
    }
    if (this.match('!=')) {
      this.addToken(TokenType.NEQ, '!=', start, startLine, startColumn);
      return;
    }
    // Single = (assignment) - must come after == check
    if (char === '=' && this.peekNext() !== '=') {
      this.advance();
      this.addToken(TokenType.ASSIGN, '=', start, startLine, startColumn);
      return;
    }
    if (this.match('<=')) {
      this.addToken(TokenType.LTE, '<=', start, startLine, startColumn);
      return;
    }
    if (this.match('>=')) {
      this.addToken(TokenType.GTE, '>=', start, startLine, startColumn);
      return;
    }
    if (this.match('&&')) {
      this.addToken(TokenType.AND_AND, '&&', start, startLine, startColumn);
      return;
    }
    if (this.match('||')) {
      this.addToken(TokenType.OR_OR, '||', start, startLine, startColumn);
      return;
    }

    // Single character tokens
    switch (char) {
      case '+': this.advance(); this.addToken(TokenType.PLUS, '+', start, startLine, startColumn); return;
      case '-': this.advance(); this.addToken(TokenType.MINUS, '-', start, startLine, startColumn); return;
      case '*': this.advance(); this.addToken(TokenType.STAR, '*', start, startLine, startColumn); return;
      case '/': this.advance(); this.addToken(TokenType.SLASH, '/', start, startLine, startColumn); return;
      case '%': this.advance(); this.addToken(TokenType.PERCENT, '%', start, startLine, startColumn); return;
      case '&': this.advance(); this.addToken(TokenType.AMPERSAND, '&', start, startLine, startColumn); return;
      case '<': this.advance(); this.addToken(TokenType.LT, '<', start, startLine, startColumn); return;
      case '>': this.advance(); this.addToken(TokenType.GT, '>', start, startLine, startColumn); return;
      case '!': this.advance(); this.addToken(TokenType.BANG, '!', start, startLine, startColumn); return;
      case '?': this.advance(); this.addToken(TokenType.QUESTION, '?', start, startLine, startColumn); return;
      case ':': this.advance(); this.addToken(TokenType.COLON, ':', start, startLine, startColumn); return;
      case '|': this.advance(); this.addToken(TokenType.PIPE, '|', start, startLine, startColumn); return;
      case '.': this.advance(); this.addToken(TokenType.DOT, '.', start, startLine, startColumn); return;
      case ',': this.advance(); this.addToken(TokenType.COMMA, ',', start, startLine, startColumn); return;
      case ';': this.advance(); this.addToken(TokenType.SEMICOLON, ';', start, startLine, startColumn); return;
      case '(': this.advance(); this.addToken(TokenType.LPAREN, '(', start, startLine, startColumn); return;
      case ')': this.advance(); this.addToken(TokenType.RPAREN, ')', start, startLine, startColumn); return;
      case '[': this.advance(); this.addToken(TokenType.LBRACKET, '[', start, startLine, startColumn); return;
      case ']': this.advance(); this.addToken(TokenType.RBRACKET, ']', start, startLine, startColumn); return;
      case '{': this.advance(); this.addToken(TokenType.LBRACE, '{', start, startLine, startColumn); return;
      case '}': this.advance(); this.addToken(TokenType.RBRACE, '}', start, startLine, startColumn); return;
      case '$': this.advance(); this.addToken(TokenType.DOLLAR, '$', start, startLine, startColumn); return;
      case '^': this.advance(); this.addToken(TokenType.CARET, '^', start, startLine, startColumn); return;
    }

    // Strings
    if (char === '"' || char === "'") {
      this.scanString(char);
      return;
    }

    // Template literals
    if (char === '`') {
      this.scanTemplateLiteral();
      return;
    }

    // Numbers
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekNext()))) {
      this.scanNumber();
      return;
    }

    // Identifiers and keywords
    if (this.isIdentifierStart(char)) {
      this.scanIdentifier();
      return;
    }

    throw new LexerError(`Unexpected character: '${char}'`, this.line, this.column, this.pos);
  }

  private scanString(quote: string): void {
    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;

    this.advance(); // consume opening quote
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (this.isAtEnd()) break;
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 'r': value += '\r'; break;
          case 't': value += '\t'; break;
          case 'b': value += '\b'; break;
          case 'f': value += '\f'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          case 'u': {
            const hex = this.input.slice(this.pos, this.pos + 4);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              value += String.fromCharCode(parseInt(hex, 16));
              this.pos += 4;
              this.column += 4;
            } else {
              value += '\\u' + hex;
            }
            break;
          }
          default: value += escaped;
        }
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 0;
        }
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated string', startLine, startColumn, start);
    }

    this.advance(); // consume closing quote
    this.addToken(TokenType.STRING, value, start, startLine, startColumn);
  }

  private scanTemplateLiteral(): void {
    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;

    this.advance(); // consume opening backtick
    let value = '';
    let hasInterpolation = false;

    while (!this.isAtEnd() && this.peek() !== '`') {
      if (this.peek() === '$' && this.peekNext() === '{') {
        hasInterpolation = true;
        // For now, just include interpolation as-is
        // Full implementation would tokenize the contents
        value += this.advance(); // $
        value += this.advance(); // {
        let braceDepth = 1;
        while (!this.isAtEnd() && braceDepth > 0) {
          const ch = this.advance();
          value += ch;
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
      } else if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 'r': value += '\r'; break;
            case 't': value += '\t'; break;
            case '`': value += '`'; break;
            case '\\': value += '\\'; break;
            case '$': value += '$'; break;
            default: value += '\\' + escaped;
          }
        }
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 0;
        }
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated template literal', startLine, startColumn, start);
    }

    this.advance(); // consume closing backtick
    this.addToken(TokenType.TEMPLATE_STRING, value, start, startLine, startColumn);
  }

  private scanNumber(): void {
    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;

    if (this.peek() === '-') this.advance();

    // Integer part
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Exponent part
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.input.slice(start, this.pos);
    this.addToken(TokenType.NUMBER, value, start, startLine, startColumn);
  }

  private scanIdentifier(): void {
    const start = this.pos;
    const startLine = this.line;
    const startColumn = this.column;

    while (this.isIdentifierPart(this.peek())) {
      this.advance();
    }

    const value = this.input.slice(start, this.pos);
    const type = KEYWORDS[value] ?? TokenType.IDENTIFIER;
    this.addToken(type, value, start, startLine, startColumn);
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.line++;
        this.column = 0;
        this.advance();
      } else if (char === '/' && this.peekNext() === '/') {
        // Single-line comment
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
      } else if (char === '/' && this.peekNext() === '*') {
        // Multi-line comment
        this.advance(); // /
        this.advance(); // *
        while (!this.isAtEnd() && !(this.peek() === '*' && this.peekNext() === '/')) {
          if (this.peek() === '\n') {
            this.line++;
            this.column = 0;
          }
          this.advance();
        }
        if (!this.isAtEnd()) {
          this.advance(); // *
          this.advance(); // /
        }
      } else {
        break;
      }
    }
  }

  // Helper methods
  private isAtEnd(): boolean {
    return this.pos >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.input.length) return '\0';
    return this.input[this.pos + 1];
  }

  private advance(): string {
    const char = this.input[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private match(expected: string): boolean {
    if (this.input.slice(this.pos, this.pos + expected.length) === expected) {
      this.pos += expected.length;
      this.column += expected.length;
      return true;
    }
    return false;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }

  private makeToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
      start: this.pos,
      end: this.pos,
    };
  }

  private addToken(type: TokenType, value: string, start: number, line: number, column: number): void {
    this.tokens.push({
      type,
      value,
      line,
      column,
      start,
      end: this.pos,
    });
  }
}

export function tokenize(input: string): Token[] {
  return new Lexer(input).tokenize();
}
