import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="Nyra - Premium AI-Powered Women's Health & Wellness Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="antialiased min-h-screen bg-[#fef7ff] text-[#18003d] transition-colors duration-300">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
