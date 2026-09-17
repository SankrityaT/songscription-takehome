/* Songscription's real mark and wordmark, pulled from songscription.ai.
   The mark is inlined so it takes currentColor; the wordmark is a CSS mask
   over currentColor for the same reason. */

const MARK_PATHS = [
  "M23.0674 123.219C29.9875 118.616 36.9998 121.246 37 130.452V170.568C36.9077 179.68 29.8948 182.404 22.9746 177.801V177.614L4.89062 165.777C2.03028 163.898 0 159.106 0 154.878V145.953C0.0923921 141.726 2.12217 136.935 4.98242 135.056L23.0674 123.219Z",
  "M294 130.468C294 121.247 300.84 118.612 307.59 123.223L325.23 135.078C328.02 136.96 330 141.759 330 145.993V154.933C330 159.167 328.02 163.966 325.23 165.848L307.59 177.703V177.798C300.84 182.409 294 179.679 294 170.552V130.468Z",
  "M99.5518 73.9564C105.211 70.0811 110.086 72.1108 109.999 78.7542V207.932C109.999 213.099 106.952 219.281 102.947 222.049L85.5342 234.044C79.9622 237.92 75 235.89 75 229.246V169.825C75 169.772 75.0001 149.269 75.0869 149.248V100.069C75.0869 94.9017 78.134 88.7197 82.1387 85.9515L99.5518 73.9564Z",
  "M247.164 72.9476C252.895 69.0882 258 71.1106 258 77.7269V201.047C258 206.193 254.865 212.35 250.746 215.107L232.836 227.053C227.105 230.912 222 228.89 222 222.274V98.9534C222 93.8075 225.135 87.6506 229.254 84.8939L247.164 72.9476Z",
  "M172.672 25.8926L154.256 37.863C150.02 40.6254 146.798 46.7948 146.798 51.9513V148.82C146.705 148.82 146.705 169.354 146.705 169.354V270.09C146.705 276.719 151.954 278.745 157.847 274.878L176.263 262.907C180.499 260.145 183.722 253.976 183.722 248.819V30.6808C183.814 24.051 178.657 22.0252 172.672 25.8926Z",
  "M220.369 6.73984C220.369 0.110052 215.121 -1.91571 209.228 1.95166L154.348 37.7709C150.112 40.5333 146.889 46.7027 146.889 51.8592V58.1207C146.797 58.1207 146.797 68.4337 146.797 68.4337V74.8793C146.797 81.5091 152.046 83.5348 157.939 79.6675L212.819 43.8482C217.055 41.0858 220.277 34.9164 220.277 29.7599",
  "M183.538 225.799C183.538 219.169 178.289 217.143 172.396 221.011L117.516 256.83C113.28 259.593 110.057 265.762 110.057 270.918V277.18C109.965 277.18 109.965 287.493 109.965 287.493V293.939C109.965 300.568 115.214 302.594 121.107 298.727L175.987 262.907C180.223 260.145 183.445 253.976 183.445 248.819",
];

export function Mark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * (301 / 330)} viewBox="0 0 330 301" fill="currentColor" aria-hidden className={className}>
      {MARK_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function WordmarkText({ height = 16, className = "" }: { height?: number; className?: string }) {
  const width = height * (681 / 114);
  return (
    <span
      role="img"
      aria-label="songscription"
      className={`inline-block bg-current ${className}`}
      style={{
        width,
        height,
        WebkitMaskImage: "url(/brand/songscription-wordmark.svg)",
        maskImage: "url(/brand/songscription-wordmark.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <Mark size={22} />
      <WordmarkText height={15} className="translate-y-px" />
    </span>
  );
}
