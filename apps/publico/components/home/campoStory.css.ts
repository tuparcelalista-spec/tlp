export const campoStoryCss = `
.tpl-campo-story {
  position: relative;
  width: 100%;
  min-height: 340px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: var(--tpl-radius-lg, 18px);
  box-shadow: var(--tpl-shadow-lg, 0 16px 36px rgba(0, 22, 44, 0.16));
}
.tpl-campo-story::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: url("/assets/tpl-bienvenida-campo.webp") center / cover no-repeat;
  transition: transform 0.8s ease;
}
.tpl-campo-story:hover::before {
  transform: scale(1.03);
}
.tpl-campo-story::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(105deg, rgba(0, 22, 44, 0.94) 0%, rgba(0, 43, 84, 0.84) 50%, rgba(0, 43, 84, 0.3) 100%);
}
.tpl-campo-story__inner {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  padding: clamp(36px, 5vw, 64px) clamp(24px, 4vw, 56px);
  max-width: 720px;
}
.tpl-campo-story__eyebrow {
  display: inline-block;
  align-self: flex-start;
  margin-bottom: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #f2cf4a;
  font-family: var(--tpl-font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.tpl-campo-story__content h2 {
  margin: 0 0 14px;
  font-family: var(--tpl-font-display, 'Lora', Georgia, serif);
  font-size: clamp(1.8rem, 3.5vw, 2.75rem);
  font-weight: 600;
  color: #ffffff;
  line-height: 1.15;
}
.tpl-campo-story__content p {
  max-width: 54ch;
  margin: 0 0 24px;
  color: rgba(255, 255, 255, 0.88);
  font-family: var(--tpl-font-sans);
  font-size: clamp(1rem, 1.1vw, 1.15rem);
  line-height: 1.6;
}
.tpl-campo-story__action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 26px;
  border-radius: 999px;
  background: #f2cf4a;
  color: #002b54;
  font-family: var(--tpl-font-sans);
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.tpl-campo-story__action:hover {
  background: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.26);
}
`;
