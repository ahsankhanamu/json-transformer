/**
 * Code Generator Module
 *
 * Provides two code generators:
 * - NativeCodeGenerator: Generates pure JavaScript without any dependencies
 * - LibraryCodeGenerator: Generates JavaScript with __helpers runtime (supports strict mode)
 */

import * as AST from '../ast.js';
import { NativeCodeGenerator } from './native.js';
import { LibraryCodeGenerator, LibraryCodeGenOptions } from './library.js';

// Re-export types and classes
export { CodeGenOptions } from './base.js';
export { NativeCodeGenerator } from './native.js';
export { LibraryCodeGenerator, LibraryCodeGenOptions } from './library.js';

// Combined options for backward compatibility
export interface FullCodeGenOptions extends LibraryCodeGenOptions {
  /** Generate native JS without helper dependencies */
  native?: boolean;
}

/**
 * Factory function to create the appropriate code generator
 */
export function createCodeGenerator(options: FullCodeGenOptions = {}) {
  if (options.native) {
    return new NativeCodeGenerator(options);
  }
  return new LibraryCodeGenerator(options);
}

/**
 * Generate JavaScript code from an AST program
 *
 * @param program - The AST program to generate code from
 * @param options - Code generation options
 * @returns Generated JavaScript code as a string
 */
export function generate(program: AST.Program, options: FullCodeGenOptions = {}): string {
  const generator = createCodeGenerator(options);
  return generator.generate(program);
}

// Legacy class for backward compatibility
export class CodeGenerator {
  private generator: NativeCodeGenerator | LibraryCodeGenerator;

  constructor(options: FullCodeGenOptions = {}) {
    this.generator = createCodeGenerator(options);
  }

  generate(program: AST.Program): string {
    return this.generator.generate(program);
  }
}
