import { IRBlock, IRBlockType } from "./types";

export function createBlock(type: IRBlockType, text?: string, children?: IRBlock[]): IRBlock {
  const block: IRBlock = { type };
  if (text !== undefined) block.text = text;
  if (children !== undefined) block.children = children;
  return block;
}

export function createRootBlock(children: IRBlock[]): IRBlock {
  return createBlock("root", undefined, children);
}

export function traverseIR(block: IRBlock, callback: (b: IRBlock) => void): void {
  callback(block);
  if (block.children) {
    block.children.forEach(child => traverseIR(child, callback));
  }
}
