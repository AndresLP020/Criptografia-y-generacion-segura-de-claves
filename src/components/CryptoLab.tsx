"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import LetterGlitch from "@/components/LetterGlitch";
import type { AesKeySize, PasswordCharsetFlags } from "@/lib/crypto";
import {
  buildPasswordAlphabet,
  bytesToBase64,
  bytesToHexUpper,
  copyToClipboard,
  generateAesKeyBytes,
  generatePassword,
  generateRsaKeyPair,
  hashText,
  log10Combinations,
  passwordEntropyBits,
} from "@/lib/crypto";

type TabId = "aes" | "rsa" | "password" | "hash" | "info";

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "aes", label: "AES (simétrica)", short: "AES" },
  { id: "rsa", label: "RSA (asimétrica)", short: "RSA" },
  { id: "password", label: "Contraseña", short: "Pwd" },
  { id: "hash", label: "Hash", short: "Hash" },
  { id: "info", label: "Guía clase", short: "Guía" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold tracking-wide text-cyber-accent text-glow md:text-xl">
      {children}
    </h2>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-cyber-accent/20 bg-black p-4 shadow-lg backdrop-blur-sm md:p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "cyan",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "cyan" | "green" | "danger";
}) {
  const styles =
    variant === "green"
      ? "bg-emerald-600/90 hover:bg-emerald-500"
      : variant === "danger"
        ? "bg-red-900/80 hover:bg-red-800"
        : "bg-cyan-600/90 hover:bg-cyan-500";
  return (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </motion.button>
  );
}

export default function CryptoLab() {
  const [tab, setTab] = useState<TabId>("aes");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const [aesBits, setAesBits] = useState<AesKeySize>(256);
  const [aesOut, setAesOut] = useState("");

  const genAes = useCallback(() => {
    const key = generateAesKeyBytes(aesBits);
    const hex = bytesToHexUpper(key);
    const b64 = bytesToBase64(key);
    setAesOut(
      [
        `Tamaño: ${aesBits} bits (${aesBits / 8} bytes)`,
        `Hex (upper): ${hex}`,
        `Base64: ${b64}`,
        "",
        "Todo el material se generó en tu navegador con crypto.getRandomValues (CSPRNG).",
        "La clave en bruto es el bloque de bytes; hex y Base64 son solo representaciones.",
      ].join("\n")
    );
  }, [aesBits]);

  const [rsaSize, setRsaSize] = useState<2048 | 3072 | 4096>(4096);
  const [rsaBusy, setRsaBusy] = useState(false);
  const [rsaPub, setRsaPub] = useState("");
  const [rsaPriv, setRsaPriv] = useState("");

  const genRsa = useCallback(async () => {
    setRsaBusy(true);
    setRsaPub("Generando… (RSA-4096 puede tardar unos segundos)");
    setRsaPriv("");
    try {
      const { publicPem, privatePem } = await generateRsaKeyPair(rsaSize);
      setRsaPub(publicPem);
      setRsaPriv(privatePem);
      showToast("Par RSA listo");
    } catch (e) {
      setRsaPub(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRsaBusy(false);
    }
  }, [rsaSize, showToast]);

  const [pwdLen, setPwdLen] = useState(24);
  const [pwdFlags, setPwdFlags] = useState<PasswordCharsetFlags>({
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
  });
  const [pwdValue, setPwdValue] = useState("");
  const [pwdAnalysis, setPwdAnalysis] = useState("");

  const alphabet = useMemo(() => buildPasswordAlphabet(pwdFlags), [pwdFlags]);

  const genPwd = useCallback(() => {
    if (alphabet.length < 2) {
      showToast("Elige al menos un tipo de carácter");
      return;
    }
    const pwd = generatePassword(pwdLen, alphabet);
    setPwdValue(pwd);
    const n = alphabet.length;
    const bits = passwordEntropyBits(pwdLen, n);
    const log10c = log10Combinations(pwdLen, n);
    let rating: string;
    if (bits >= 128) rating = "Excelente para cuentas críticas (≈128+ bits de entropía).";
    else if (bits >= 80) rating = "Buena para uso general.";
    else if (bits >= 64) rating = "Aceptable; sube longitud o tipos de carácter para datos sensibles.";
    else rating = "Débil; evita para secretos reales.";

    setPwdAnalysis(
      [
        `Alfabeto: ${n} símbolos | Longitud: ${pwdLen}`,
        `Entropía (ideal, uniforme): ${bits.toFixed(2)} bits`,
        `log₁₀(combinaciones) ≈ ${log10c.toFixed(2)}`,
        "",
        rating,
        "",
        "Nota: la entropía real de contraseñas elegidas por humanos es menor que la de cadenas totalmente aleatorias.",
      ].join("\n")
    );
  }, [alphabet, pwdLen, showToast]);

  const [hashAlgo, setHashAlgo] = useState<"SHA-256" | "SHA-512" | "SHA-1">("SHA-256");
  const [hashInput, setHashInput] = useState("");
  const [hashOut, setHashOut] = useState("");

  const doHash = useCallback(async () => {
    if (!hashInput.trim()) {
      showToast("Escribe texto para hashear");
      return;
    }
    const h = await hashText(hashAlgo, hashInput);
    setHashOut(h);
  }, [hashAlgo, hashInput, showToast]);

  const onCopy = async (text: string, label: string) => {
    if (!text.trim()) return;
    const ok = await copyToClipboard(text);
    showToast(ok ? `${label} copiado` : "No se pudo copiar (permiso del navegador)");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-0 min-h-screen w-full"
        aria-hidden
      >
        <LetterGlitch
          glitchColors={[
            "#030712",
            "#071018",
            "#0c1929",
            "#152238",
            "#1e3a5f",
            "#0e7490",
            "#22d3ee",
            "#00f0ff",
          ]}
          glitchSpeed={50}
          centerVignette
          outerVignette={false}
          smooth
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-grid-cyber bg-[length:48px_48px] opacity-[0.28]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-glow-radial opacity-90"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-cyber-accent/60 to-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-6 [&_*]:selection:bg-cyber-accent/40 [&_*]:selection:text-white">
        <motion.header
          className="mb-10 rounded-xl border border-cyber-accent/20 bg-black px-5 py-8 text-center shadow-lg backdrop-blur-sm md:px-10 md:py-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="font-display text-2xl font-bold tracking-[0.2em] text-white text-glow md:text-4xl"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            LABORATORIO DE CLAVES
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-200 md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-cyber-ice/95">Generación segura en el navegador</span>
            <span className="text-cyber-muted"> · </span>
            <span className="text-slate-200">Web Crypto API</span>
            <span className="text-cyber-muted"> · </span>
            <span className="text-slate-300">Material educativo</span>
          </motion.p>
        </motion.header>

        <nav className="mb-8 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              whileHover={{ y: -2 }}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors md:px-4 md:text-sm ${
                tab === t.id
                  ? "border-cyber-accent bg-cyber-accent/15 text-cyber-accent"
                  : "border-white/10 bg-black text-slate-400 hover:border-cyber-accent/40 hover:text-slate-200"
              }`}
            >
              <span className="md:hidden">{t.short}</span>
              <span className="hidden md:inline">{t.label}</span>
            </motion.button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {tab === "aes" && (
            <motion.div
              key="aes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Panel>
                <SectionTitle>Cifrado simétrico · AES</SectionTitle>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  AES usa la misma clave para cifrar y descifrar. En la práctica conviene combinarla
                  con un modo autenticado (por ejemplo GCM) y vectores de inicialización únicos por
                  mensaje. La clave debe ser aleatoria y mantenerse en secreto.
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-black p-4 text-xs text-cyan-200/90">
                  <strong className="text-cyber-accent">Para la clase:</strong> 128, 192 y 256 bits
                  son tamaños válidos de clave AES. Hoy AES-256 es el objetivo habitual para datos de
                  larga vida; AES-128 sigue siendo muy usado cuando el modelo de amenaza lo permite.
                  Lo crítico es el generador aleatorio (CSPRNG), no “inventar” claves a mano.
                </div>
                <p className="mt-4 text-xs text-cyber-warn/90">
                  Corrige un mito: el “ataque de cumpleaños” aparece en otros contextos (p. ej. hash);
                  no implica que AES-128 “se rompe en horas” en condiciones normales de clave aleatoria.
                </p>
              </Panel>

              <Panel>
                <p className="mb-3 text-sm font-medium text-slate-300">Tamaño de clave</p>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  {([128, 192, 256] as const).map((b) => (
                    <label
                      key={b}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="aes"
                        checked={aesBits === b}
                        onChange={() => setAesBits(b)}
                        className="accent-cyan-500"
                      />
                      <span>
                        {b} bits
                        {b === 256 ? " — recomendado" : b === 192 ? " — muy bueno" : " — ligero"}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton onClick={genAes}>Generar clave AES</PrimaryButton>
                  <PrimaryButton variant="green" onClick={() => onCopy(aesOut, "Salida AES")}>
                    Copiar resultado
                  </PrimaryButton>
                </div>
                <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-cyber-green/25 bg-black p-4 text-xs text-cyber-green">
                  {aesOut || "Pulsa generar. Aquí verás hex y Base64."}
                </pre>
              </Panel>
            </motion.div>
          )}

          {tab === "rsa" && (
            <motion.div
              key="rsa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Panel>
                <SectionTitle>RSA · par de claves (asimétrico)</SectionTitle>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Aquí generamos un par RSA para firma (RSASSA-PKCS1-v1_5 con SHA-256). La clave
                  pública se puede distribuir; la privada firma y debe permanecer bajo tu control.
                  En TLS moderno se prefieren curvas elípticas por rendimiento, pero RSA sigue siendo
                  pedagógico y muy presente en certificados legacy.
                </p>
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-black p-4 text-xs text-amber-100/90">
                  <strong>NIST SP 800-57 (resumen):</strong> 2048 bits es mínimo habitual en muchos
                  despliegues; 3072 ofrece margen mayor; 4096 aumenta coste de CPU. Planifica
                  migración según vida útil de tus datos, no solo parches del día.
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {([2048, 3072, 4096] as const).map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="rsa"
                        checked={rsaSize === s}
                        onChange={() => setRsaSize(s)}
                        className="accent-cyan-500"
                      />
                      RSA-{s}
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton onClick={genRsa} disabled={rsaBusy}>
                    {rsaBusy ? "Generando…" : "Generar par RSA"}
                  </PrimaryButton>
                  <PrimaryButton variant="green" onClick={() => onCopy(rsaPub, "Clave pública")}>
                    Copiar pública
                  </PrimaryButton>
                  <PrimaryButton variant="danger" onClick={() => onCopy(rsaPriv, "Clave privada")}>
                    Copiar privada
                  </PrimaryButton>
                </div>
              </Panel>
              <Panel>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Clave pública (PEM)
                </p>
                <pre className="max-h-56 overflow-auto rounded-lg border border-cyan-500/20 bg-black p-3 text-[11px] text-cyber-green">
                  {rsaPub || "—"}
                </pre>
              </Panel>
              <Panel>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-300">
                  Clave privada (PEM) · no compartir
                </p>
                <pre className="max-h-56 overflow-auto rounded-lg border border-red-500/20 bg-black p-3 text-[11px] text-amber-200/90">
                  {rsaPriv || "—"}
                </pre>
              </Panel>
            </motion.div>
          )}

          {tab === "password" && (
            <motion.div
              key="pwd"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Panel>
                <SectionTitle>Contraseñas aleatorias vs claves criptográficas</SectionTitle>
                <p className="mt-3 text-sm text-slate-300">
                  Una contraseña humana rara vez alcanza la entropía de una clave dibujada de un
                  CSPRNG. Para cuentas, un gestor de contraseñas que genere cadenas largas y aleatorias
                  se acerca al modelo ideal. Aquí simulamos esa idea con el mismo tipo de aleatoriedad
                  que usaría <code className="text-cyan-300">secrets</code> en Python.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-slate-400">
                      Longitud: <strong className="text-white">{pwdLen}</strong>
                    </label>
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={pwdLen}
                      onChange={(e) => setPwdLen(Number(e.target.value))}
                      className="mt-2 w-full accent-cyan-500"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    {(
                      [
                        ["upper", "Mayúsculas A–Z"],
                        ["lower", "Minúsculas a–z"],
                        ["digits", "Dígitos 0–9"],
                        ["symbols", "Símbolos"],
                      ] as const
                    ).map(([k, lab]) => (
                      <label key={k} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pwdFlags[k]}
                          onChange={(e) =>
                            setPwdFlags((f) => ({ ...f, [k]: e.target.checked }))
                          }
                          className="accent-cyan-500"
                        />
                        {lab}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton onClick={genPwd}>Generar</PrimaryButton>
                  <PrimaryButton variant="green" onClick={() => onCopy(pwdValue, "Contraseña")}>
                    Copiar
                  </PrimaryButton>
                </div>
                <div className="mt-4 rounded-lg border border-cyber-green/30 bg-black p-4 font-mono text-sm text-cyber-green break-all">
                  {pwdValue || "—"}
                </div>
                <pre className="mt-4 text-xs leading-relaxed text-slate-400 whitespace-pre-wrap">
                  {pwdAnalysis || "Genera una contraseña para ver entropía aproximada."}
                </pre>
              </Panel>
            </motion.div>
          )}

          {tab === "hash" && (
            <motion.div
              key="hash"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Panel>
                <SectionTitle>Funciones hash</SectionTitle>
                <p className="mt-3 text-sm text-slate-300">
                  Un hash criptográfico produce un resumen de tamaño fijo; es unidireccional (en la
                  práctica no se recupera el mensaje desde el digest).{" "}
                  <strong className="text-amber-200">SHA-1 está obsoleto</strong> para seguridad;
                  incluido solo para comparar en clase. Para integridad hoy usa SHA-256 o SHA-512.
                  <span className="block mt-2 text-cyber-warn/90">
                    Ojo: hash ≠ almacenamiento de contraseñas. Para guardar contraseñas usa Argon2,
                    scrypt o bcrypt con sal y parámetros adecuados.
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["SHA-256", "SHA-512", "SHA-1"] as const).map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="hash"
                        checked={hashAlgo === a}
                        onChange={() => setHashAlgo(a)}
                        className="accent-cyan-500"
                      />
                      {a}
                      {a === "SHA-1" && <span className="text-red-400">(solo demo)</span>}
                    </label>
                  ))}
                </div>
                <textarea
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  placeholder="Texto a hashear…"
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-white/10 bg-black p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <PrimaryButton onClick={doHash}>Calcular hash</PrimaryButton>
                  <PrimaryButton variant="green" onClick={() => onCopy(hashOut, "Hash")}>
                    Copiar digest
                  </PrimaryButton>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-cyber-accent/25 bg-black p-4 text-xs text-cyber-green">
                  {hashOut || "—"}
                </pre>
              </Panel>
            </motion.div>
          )}

          {tab === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Panel>
                <SectionTitle>Guía rápida para exponer en clase</SectionTitle>
                <ul className="mt-4 list-inside list-decimal space-y-4 text-sm text-slate-300 leading-relaxed">
                  <li>
                    <strong className="text-cyber-accent">Simétrico vs asimétrico:</strong> AES es
                    un solo secreto compartido; RSA/ECDH usan par público/privado. Explica con un
                    sobre: la clave simétrica es el papel dentro; la asimétrica es un buzón con
                    ranura (pública) y llave (privada).
                  </li>
                  <li>
                    <strong className="text-cyber-accent">CSPRNG:</strong> Muestra por qué{" "}
                    <code className="text-cyan-200">Math.random</code> no sirve para claves. En el
                    navegador, <code className="text-cyan-200">crypto.getRandomValues</code> y{" "}
                    <code className="text-cyan-200">subtle</code> van al generador del sistema.
                  </li>
                  <li>
                    <strong className="text-cyber-accent">Entropía:</strong> bits ≈ longitud ×
                    log₂(tamaño del alfabeto). Relaciona con tiempo de búsqueda exahustiva solo como
                    orden de magnitud pedagógico (en la vida real entran diccionarios, filtraciones,
                    reutilización).
                  </li>
                  <li>
                    <strong className="text-cyber-accent">Hashes:</strong> Integridad y
                    construcción de primitivas (HMAC, árboles Merkle). Desaconseja SHA-1 y MD5 para
                    seguridad.
                  </li>
                  <li>
                    <strong className="text-cyber-accent">Deriva de claves:</strong> PBKDF2, scrypt,
                    Argon2 para pasar de contraseña humana a clave fuerte; nunca SHA “directo” sin
                    sal ni trabajo.
                  </li>
                  <li>
                    <strong className="text-cyber-accent">Referencias:</strong> NIST SP 800-57,
                    SP 800-132, documentación MDN Web Crypto, libro de Katz–Lindell o curso de
                    Boneh para profundizar.
                  </li>
                </ul>
                <p className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">
                  Este demo no envía datos a ningún servidor: todo corre en tu equipo. No uses claves
                  de producción en presentaciones grabadas sin censurar.
                </p>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-cyber-accent/40 bg-black px-5 py-3 text-sm text-cyber-accent shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
