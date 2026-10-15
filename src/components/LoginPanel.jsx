import { useState } from "react";

export function LoginPanel({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await onSignIn(email, password);
    if (error) setError("Nieprawidłowy e-mail lub hasło.");
  };

  return (
    <form className="login" onSubmit={submit}>
      <h1>Logowanie</h1>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
             placeholder="e-mail" autoComplete="username" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
             placeholder="hasło" autoComplete="current-password" required />
      {error && <div className="login__error">{error}</div>}
      <button className="btn" type="submit">Zaloguj</button>
    </form>
  );
}