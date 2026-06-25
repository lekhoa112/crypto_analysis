"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, User, Wallet, api, clearAuthTokens, formatUsd, getAuthTokens, setAuthTokens } from "@/lib/api";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000/ws/alerts";

type View = "dashboard" | "wallets" | "history" | "settings";

export default function Home() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threshold, setThreshold] = useState(100000);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [walletData, alertData, thresholdData] = await Promise.all([
        api.listWallets(),
        api.listAlerts(),
        api.getThreshold(),
      ]);
      setWallets(walletData);
      setAlerts(alertData);
      setThreshold(thresholdData.threshold_usd);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot load data");
    }
  }

  useEffect(() => {
    async function loadSession() {
      const { accessToken } = getAuthTokens();
      if (!accessToken) {
        setInitializing(false);
        return;
      }

      try {
        setUser(await api.me());
      } catch {
        clearAuthTokens();
      } finally {
        setInitializing(false);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    refresh();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setStatus("Live");
    socket.onclose = () => setStatus("Offline");
    socket.onerror = () => setStatus("Socket error");
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "alert") {
        setAlerts((current) => [payload.data as Alert, ...current].slice(0, 100));
      }
    };
    return () => socket.close();
  }, [user]);

  const activeWallets = wallets.filter((wallet) => wallet.is_active).length;
  const totalAlertValue = useMemo(
    () => alerts.reduce((sum, alert) => sum + alert.usd_value, 0),
    [alerts],
  );

  async function logout() {
    const { refreshToken } = getAuthTokens();
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // Local logout should still complete if the server token is already invalid.
      }
    }
    clearAuthTokens();
    setUser(null);
    setWallets([]);
    setAlerts([]);
    setView("dashboard");
  }

  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-crypto-bg px-5 text-crypto-text">
        <div className="rounded-panel border border-white/10 bg-crypto-card px-5 py-4 text-sm font-bold text-crypto-muted">
          Loading session
        </div>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <main className="min-h-screen bg-crypto-bg px-5 py-5 text-crypto-text lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-panel border border-white/10 bg-crypto-card p-4">
          <div className="mb-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-panel bg-crypto-primary text-xl font-black text-crypto-bg">
              ₿
            </div>
            <h1 className="mt-4 text-xl font-black">Whale Alert</h1>
            <p className="mt-1 text-sm text-crypto-muted">Realtime on-chain monitor</p>
          </div>
          <nav className="grid gap-2">
            {[
              ["dashboard", "Dashboard"],
              ["wallets", "Wallet list"],
              ["history", "Alert history"],
              ["settings", "Settings"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key as View)}
                className={`rounded-panel px-3 py-2 text-left text-sm font-bold ${
                  view === key
                    ? "bg-crypto-primary text-crypto-bg"
                    : "text-crypto-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 flex flex-col justify-between gap-4 rounded-panel border border-white/10 bg-crypto-card p-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase text-crypto-muted">Crypto monitoring terminal</p>
              <h2 className="mt-2 text-3xl font-black">Whale transaction alerts</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-3 py-2 text-sm font-bold text-crypto-muted">
                {user.email}
              </span>
              <span className="rounded-full bg-crypto-primary/10 px-3 py-2 text-sm font-black text-crypto-primary">
                {status}
              </span>
              <button
                onClick={refresh}
                className="rounded-panel bg-crypto-secondary px-4 py-2 text-sm font-black text-white"
              >
                Refresh
              </button>
              <button
                onClick={logout}
                className="rounded-panel bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15"
              >
                Logout
              </button>
            </div>
          </header>

          {error ? (
            <div className="mb-5 rounded-panel border border-crypto-danger/40 bg-crypto-danger/10 p-4 text-sm text-crypto-danger">
              {error}
            </div>
          ) : null}

          {view === "dashboard" ? (
            <Dashboard alerts={alerts} activeWallets={activeWallets} totalAlertValue={totalAlertValue} />
          ) : null}
          {view === "wallets" ? <Wallets wallets={wallets} onChanged={refresh} /> : null}
          {view === "history" ? <AlertHistory alerts={alerts} /> : null}
          {view === "settings" ? (
            <Settings threshold={threshold} onSaved={(value) => setThreshold(value)} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("Loading...");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadCaptcha() {
    try {
      const challenge = await api.captcha();
      setCaptchaToken(challenge.token);
      setCaptchaQuestion(challenge.question);
      setCaptchaAnswer("");
    } catch {
      setCaptchaToken("");
      setCaptchaQuestion("Captcha unavailable");
    }
  }

  useEffect(() => {
    loadCaptcha();
  }, [mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "register") {
        await api.register({
          email,
          password,
          confirm_password: confirmPassword,
          full_name: fullName || undefined,
          captcha_token: captchaToken,
          captcha_answer: captchaAnswer,
        });
      }

      const tokens = await api.login({
        email,
        password,
        captcha_token: captchaToken,
        captcha_answer: captchaAnswer,
      });
      setAuthTokens(tokens);
      onAuthenticated(await api.me());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      loadCaptcha();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-crypto-bg px-5 py-8 text-crypto-text">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section>
          <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-crypto-primary text-xl font-black text-crypto-bg">
            BTC
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight md:text-5xl">
            Whale Alert
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-crypto-muted">
            Sign in to manage tracked wallets, alert thresholds, and realtime transaction history.
          </p>
        </section>

        <form onSubmit={submit} className="rounded-panel border border-white/10 bg-crypto-card p-5">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-panel bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`h-10 rounded-panel text-sm font-black ${
                mode === "login" ? "bg-crypto-primary text-crypto-bg" : "text-crypto-muted"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`h-10 rounded-panel text-sm font-black ${
                mode === "register" ? "bg-crypto-primary text-crypto-bg" : "text-crypto-muted"
              }`}
            >
              Register
            </button>
          </div>

          <div className="grid gap-3">
            {mode === "register" ? (
              <label className="grid gap-2 text-sm font-bold text-crypto-muted">
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-crypto-text outline-none focus:border-crypto-primary"
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-bold text-crypto-muted">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-crypto-text outline-none focus:border-crypto-primary"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-crypto-muted">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-crypto-text outline-none focus:border-crypto-primary"
                required
                minLength={mode === "register" ? 8 : undefined}
              />
            </label>

            {mode === "register" ? (
              <label className="grid gap-2 text-sm font-bold text-crypto-muted">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-crypto-text outline-none focus:border-crypto-primary"
                  required
                  minLength={8}
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-bold text-crypto-muted">
              Captcha
              <div className="grid grid-cols-[1fr_44px] gap-2">
                <span className="flex h-11 items-center rounded-panel border border-white/10 bg-white/5 px-3 text-sm font-black text-crypto-text">
                  {captchaQuestion}
                </span>
                <button
                  type="button"
                  onClick={loadCaptcha}
                  className="h-11 rounded-panel border border-white/10 bg-white/5 text-lg font-black text-crypto-text"
                >
                  ↻
                </button>
              </div>
              <input
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value)}
                className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-crypto-text outline-none focus:border-crypto-primary"
                required
                inputMode="numeric"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-panel border border-crypto-danger/40 bg-crypto-danger/10 p-3 text-sm font-bold text-crypto-danger">
              {error}
            </div>
          ) : null}

          <button
            disabled={busy}
            className="mt-5 h-11 w-full rounded-panel bg-crypto-primary px-4 text-sm font-black text-crypto-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait" : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({
  alerts,
  activeWallets,
  totalAlertValue,
}: {
  alerts: Alert[];
  activeWallets: number;
  totalAlertValue: number;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Active wallets" value={String(activeWallets)} />
        <Metric label="Alerts" value={String(alerts.length)} />
        <Metric label="Alert value" value={formatUsd(totalAlertValue)} />
      </div>
      <AlertHistory alerts={alerts.slice(0, 8)} title="Realtime alerts" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-white/10 bg-crypto-card p-5">
      <p className="text-sm font-bold text-crypto-muted">{label}</p>
      <strong className="mt-3 block text-3xl font-black">{value}</strong>
    </div>
  );
}

function Wallets({ wallets, onChanged }: { wallets: Wallet[]; onChanged: () => void }) {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [label, setLabel] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.createWallet({ address, chain, label });
    setAddress("");
    setLabel("");
    onChanged();
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={submit} className="grid gap-3 rounded-panel border border-white/10 bg-crypto-card p-5 lg:grid-cols-[1fr_160px_200px_auto]">
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="0x whale wallet address"
          className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-crypto-primary"
          required
        />
        <select
          value={chain}
          onChange={(event) => setChain(event.target.value)}
          className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-crypto-primary"
        >
          <option value="ethereum">Ethereum</option>
          <option value="bsc">BNB Chain</option>
          <option value="polygon">Polygon</option>
          <option value="solana">Solana</option>
        </select>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label"
          className="h-11 rounded-panel border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-crypto-primary"
          required
        />
        <button className="h-11 rounded-panel bg-crypto-primary px-4 text-sm font-black text-crypto-bg">
          Add wallet
        </button>
      </form>

      <div className="overflow-hidden rounded-panel border border-white/10 bg-crypto-card">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-crypto-muted">
            <tr>
              <th className="p-4">Label</th>
              <th className="p-4">Address</th>
              <th className="p-4">Chain</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((wallet) => (
              <WalletRow key={wallet.id} wallet={wallet} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WalletRow({ wallet, onChanged }: { wallet: Wallet; onChanged: () => void }) {
  const [label, setLabel] = useState(wallet.label);

  async function save() {
    await api.updateWallet(wallet.id, { label });
    onChanged();
  }

  async function toggle() {
    await api.updateWallet(wallet.id, { is_active: !wallet.is_active });
    onChanged();
  }

  async function remove() {
    await api.deleteWallet(wallet.id);
    onChanged();
  }

  return (
    <tr className="border-t border-white/10">
      <td className="p-4">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={save}
          className="h-9 w-full rounded-panel border border-white/10 bg-white/5 px-3 outline-none focus:border-crypto-primary"
        />
      </td>
      <td className="p-4 font-mono text-xs text-crypto-muted">{wallet.address}</td>
      <td className="p-4">{wallet.chain}</td>
      <td className="p-4">
        <button
          onClick={toggle}
          className={`rounded-full px-3 py-1 text-xs font-black ${
            wallet.is_active ? "bg-crypto-primary/10 text-crypto-primary" : "bg-white/10 text-crypto-muted"
          }`}
        >
          {wallet.is_active ? "Active" : "Paused"}
        </button>
      </td>
      <td className="p-4 text-right">
        <button onClick={remove} className="rounded-panel bg-crypto-danger/10 px-3 py-2 text-xs font-black text-crypto-danger">
          Delete
        </button>
      </td>
    </tr>
  );
}

function AlertHistory({ alerts, title = "Alert history" }: { alerts: Alert[]; title?: string }) {
  return (
    <div className="rounded-panel border border-white/10 bg-crypto-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black">{title}</h3>
        <span className="text-sm font-bold text-crypto-muted">{alerts.length} rows</span>
      </div>
      <div className="grid gap-3">
        {alerts.length === 0 ? (
          <div className="rounded-panel border border-white/10 bg-white/5 p-4 text-sm text-crypto-muted">
            No alerts yet. Send the fake webhook sample to test realtime alerts.
          </div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className="rounded-panel border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                <div>
                  <h4 className="font-black">{alert.title}</h4>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-crypto-muted">{alert.message}</p>
                </div>
                <strong className="text-crypto-primary">{formatUsd(alert.usd_value)}</strong>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Settings({ threshold, onSaved }: { threshold: number; onSaved: (value: number) => void }) {
  const [value, setValue] = useState(String(threshold));
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setValue(String(threshold));
  }, [threshold]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextValue = Number(value);
    const response = await api.updateThreshold(nextValue);
    onSaved(response.threshold_usd);
    setSaved(`Saved ${formatUsd(response.threshold_usd)}`);
  }

  return (
    <form onSubmit={submit} className="max-w-xl rounded-panel border border-white/10 bg-crypto-card p-5">
      <label className="text-sm font-black text-crypto-muted">Telegram alert threshold</label>
      <div className="mt-3 flex gap-3">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-panel border border-white/10 bg-white/5 px-3 outline-none focus:border-crypto-primary"
        />
        <button className="rounded-panel bg-crypto-primary px-5 text-sm font-black text-crypto-bg">
          Save
        </button>
      </div>
      {saved ? <p className="mt-3 text-sm font-bold text-crypto-primary">{saved}</p> : null}
    </form>
  );
}
