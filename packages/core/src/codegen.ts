/**
 * Code Generator - Re-exports from the modular codegen implementation
 *
 * This file exists for backward compatibility. The actual implementation
 * is split into:
 * - codegen/base.ts    - Base class with shared functionality
 * - codegen/native.ts  - Pure JS generator (no dependencies)
 * - codegen/library.ts - Library JS generator (with __helpers)
 * - codegen/index.ts   - Factory and exports
 */

export type { CodeGenOptions, FullCodeGenOptions, LibraryCodeGenOptions } from './codegen/index.js';

export {
  NativeCodeGenerator,
  LibraryCodeGenerator,
  CodeGenerator,
  createCodeGenerator,
  generate,
} from './codegen/index.js';
