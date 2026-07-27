// react-undraw-illustrations ships no type declarations (plain JS, last
// published years ago) - this ambient module declaration lets TS import
// named illustration components from it without a type error. Illustrations
// are purely decorative here, so untyped (any) props are an acceptable
// trade-off rather than hand-writing types for a package we don't control.
declare module "react-undraw-illustrations";
