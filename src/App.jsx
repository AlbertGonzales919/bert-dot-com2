import { Component, useEffect, useRef, useState } from "react";
import * as cfg from "./config";

const { profile } = cfg;
const ACCENT = cfg.accent ?? cfg.themes?.[cfg.defaultTheme]?.accent ?? "#3ddc97";
const MODE = cfg.mode ?? cfg.defaultMode ?? "dark";



const NS = "bert-portfolio:"; // keeps this site's saved settings separate from other apps on localhost

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(NS + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const onAccent = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const brightness = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return brightness > 150 ? "#10202b" : "#ffffff";
};

const shrink = (file, max = 900) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/webp", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });

/*  color  */

function useColors() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", ACCENT);
    root.style.setProperty("--on-accent", onAccent(ACCENT));
    root.dataset.mode = MODE;
  }, []);
}


function Reveal({ as: Tag = "div", delay = 0, className = "", children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

const Section = ({ id, title, children }) => (
  <section id={id}>
    <Reveal as="h2">{title}</Reveal>
    <Reveal delay={80}>{children}</Reveal>
  </section>
);

/*  certifications  */

function CertCard({ cert }) {
  const key = `cert:${cert.id}`;
  const inputRef = useRef(null);
  const [uploaded, setUploaded] = useState(() => load(key, null));
  const [error, setError] = useState("");
  const img = uploaded || cert.image;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await shrink(file);
      if (!save(key, data)) throw new Error("storage full");
      setUploaded(data);
      setError("");
    } catch {
      setError("Couldn’t save that image. Try a smaller file, or add it to public/certs and set image in config.js.");
    }
  };

  const remove = () => {
    try {
      localStorage.removeItem(NS + key);
    } catch {
      /* ignore */
    }
    setUploaded(null);
  };

  return (
    <figure className="cert">
      <button
        className={`frame ${img ? "" : "empty"}`}
        onClick={() => inputRef.current.click()}
        aria-label={`Upload an image for ${cert.name}`}
      >
        {img ? <img src={img} alt={`${cert.name} certificate`} /> : <span>Add certificate or badge image</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <figcaption>
        <strong>{cert.name}</strong>
        <span className="muted">
          {cert.issuer}
          {cert.year ? `, ${cert.year}` : ""}
        </span>
        {uploaded && (
          <button className="link" onClick={remove}>
            Remove image
          </button>
        )}
        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/*  contact  */

function Contact() {
  const { email, facebook, linkedin } = profile.contact;
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const bare = (url) => url.replace(/^https?:\/\//, "");

  // Opens the visitor's email app with the message filled in.
  // To send without an email app, swap this for a service like Formspree.
  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${f.name}`);
    const body = encodeURIComponent(`${f.message}\n\nFrom: ${f.name} (${f.email})`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="contact">
      <ul className="contact-links">
        <li>
          <span>Email</span>
          <a href={`mailto:${email}`}>{email}</a>
        </li>
        <li>
          <span>Facebook</span>
          <a href={facebook} target="_blank" rel="noreferrer">{bare(facebook)}</a>
        </li>
        <li>
          <span>LinkedIn</span>
          <a href={linkedin} target="_blank" rel="noreferrer">{bare(linkedin)}</a>
        </li>
      </ul>

      <form onSubmit={submit}>
        <label>
          Your name
          <input required value={f.name} onChange={set("name")} />
        </label>
        <label>
          Your email
          <input required type="email" value={f.email} onChange={set("email")} />
        </label>
        <label>
          Message
          <textarea required rows={5} value={f.message} onChange={set("message")} />
        </label>
        <button className="btn" type="submit">Send message</button>
        {sent && <p className="muted" role="status">Your email app should open with the message ready to send.</p>}
      </form>
    </div>
  );
}

/*  page  */

const nav = [
  ["about", "About"],
  ["education", "Education"],
  ["experience", "Experience"],
  ["certifications", "Certifications"],
  ["contact", "Contact"],
];

function Portfolio() {
  useColors();
  const { name, title, status, tagline, about, education, experience, certifications } = profile;

  useEffect(() => {
    document.title = `${name} | Portfolio`;
  }, [name]);

  // Fonts load after the page is shown, so a slow connection never blocks it.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  return (
    <>
      <nav className="nav">
        <a className="brand" href="#top">{name}</a>
        <div className="links">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </div>
      </nav>

      <main id="top">
        <header className="hero">
          <p className="status"><span className="dot" />{status}</p>
          <h1>{name}</h1>
          <p className="role">{title}</p>
          {tagline && <p className="lede">{tagline}</p>}
          <div className="actions">
            <a className="btn" href="#contact">Get in touch</a>
            <a className="btn ghost" href="#experience">View experience</a>
          </div>
        </header>

        <Section id="about" title="About me">
          {about.map((p, i) => (
            <p key={i} className="prose">{p}</p>
          ))}
        </Section>

        <Section id="education" title="Education">
          {education.map((e, i) => (
            <article key={i} className="entry">
              <h3>{e.degree}</h3>
              <p>{e.school}</p>
              <p className="muted">{e.years}</p>
            </article>
          ))}
        </Section>

        <Section id="experience" title="Experience">
          {experience.map((x, i) => (
            <article key={i} className="entry timeline">
              <h3>{x.role}</h3>
              <p>{x.company} <span className="muted">({x.period})</span></p>
              <ul>
                {x.points.map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
            </article>
          ))}
        </Section>

        <Section id="certifications" title="Certifications">
          <div className="certs">
            {certifications.map((c) => (
              <CertCard key={c.id} cert={c} />
            ))}
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <Contact />
        </Section>

        <footer className="foot">© {new Date().getFullYear()} {name}</footer>
      </main>
    </>
  );
}

/* Shows the real error on screen instead of a blank page. */
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <pre style={{ margin: 0, minHeight: "100vh", padding: "1.5rem", whiteSpace: "pre-wrap", background: "#0f1b24", color: "#ff7a7a" }}>
        {"Something went wrong:\n\n" + String(this.state.error?.stack || this.state.error)}
      </pre>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Portfolio />
    </ErrorBoundary>
  );
}
