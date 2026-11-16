import katex from "katex";
import "katex/contrib/mhchem";

/** KaTeX with mhchem (\ce{...}). Always LTR, even inside Arabic text. */
export function Tex({ latex, display = false }: { latex: string; display?: boolean }) {
  const html = katex.renderToString(latex, { displayMode: display, throwOnError: false, output: "htmlAndMathml" });
  return <span dir="ltr" className="inline-block" dangerouslySetInnerHTML={{ __html: html }} />;
}
