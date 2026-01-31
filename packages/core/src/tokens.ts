/**
 * MapQL Token Types and Definitions
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  TEMPLATE_START = 'TEMPLATE_START',
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',
  TEMPLATE_END = 'TEMPLATE_END',
  TEMPLATE_STRING = 'TEMPLATE_STRING', // No interpolation
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  UNDEFINED = 'UNDEFINED',

  // Identifiers & Keywords
  IDENTIFIER = 'IDENTIFIER',
  LET = 'LET',
  CONST = 'CONST',
  IF = 'IF',
  ELSE = 'ELSE',
  AS = 'AS',
  IN = 'IN',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  PERCENT = 'PERCENT', // %
  AMPERSAND = 'AMPERSAND', // & (string concat)

  ASSIGN = 'ASSIGN', // =
  EQ = 'EQ', // ==
  NEQ = 'NEQ', // !=
  STRICT_EQ = 'STRICT_EQ', // ===
  STRICT_NEQ = 'STRICT_NEQ', // !==
  LT = 'LT', // <
  GT = 'GT', // >
  LTE = 'LTE', // <=
  GTE = 'GTE', // >=

  AND_AND = 'AND_AND', // &&
  OR_OR = 'OR_OR', // ||
  BANG = 'BANG', // !
  QUESTION = 'QUESTION', // ?
  COLON = 'COLON', // :
  QUESTION_QUESTION = 'QUESTION_QUESTION', // ??
  QUESTION_DOT = 'QUESTION_DOT', // ?.
  QUESTION_BRACKET = 'QUESTION_BRACKET', // ?[

  PIPE = 'PIPE', // |
  ARROW = 'ARROW', // =>
  SPREAD = 'SPREAD', // ...

  // Punctuation
  DOT = 'DOT', // .
  COMMA = 'COMMA', // ,
  SEMICOLON = 'SEMICOLON', // ;
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  LBRACE = 'LBRACE', // {
  RBRACE = 'RBRACE', // }

  // Context markers
  DOLLAR = 'DOLLAR', // $ (root)
  CARET = 'CARET', // ^ (parent)
  DOLLAR_DOLLAR = 'DOLLAR_DOLLAR', // $$ (bindings)

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.LET,
  const: TokenType.CONST,
  if: TokenType.IF,
  else: TokenType.ELSE,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
  undefined: TokenType.UNDEFINED,
  as: TokenType.AS,
  in: TokenType.IN,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
};
