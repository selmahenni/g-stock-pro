import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="light">
      <body>{children}</body>
    </html>
  );
}