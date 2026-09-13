export const propertyAiFinderCss = `
.tpl-property-ai-finder {
  margin-top: 3.5rem;
  padding: clamp(2rem, 4vw, 3rem);
  background: linear-gradient(135deg, #0f2942 0%, #1e3a8a 100%);
  border-radius: var(--tpl-radius-lg, 18px);
  color: #ffffff;
  box-shadow: 0 16px 36px rgba(0, 22, 44, 0.16);
}
.tpl-property-ai-finder__header {
  max-width: 680px;
  margin-bottom: 1.5rem;
}
.tpl-property-ai-finder__eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f2cf4a;
  margin-bottom: 0.5rem;
}
.tpl-property-ai-finder__title {
  margin: 0 0 0.5rem;
  font-family: var(--tpl-font-display, 'Lora', serif);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 600;
  line-height: 1.2;
  color: #ffffff;
}
.tpl-property-ai-finder__subtitle {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}
.tpl-property-ai-finder__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.tpl-property-ai-finder__input-wrapper {
  position: relative;
}
.tpl-property-ai-finder__textarea {
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--tpl-radius-md, 12px);
  color: #ffffff;
  font-family: var(--tpl-font-sans);
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 90px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.tpl-property-ai-finder__textarea::placeholder {
  color: rgba(255, 255, 255, 0.55);
}
.tpl-property-ai-finder__textarea:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.12);
  border-color: #f2cf4a;
  box-shadow: 0 0 0 3px rgba(242, 207, 74, 0.25);
}
.tpl-property-ai-finder__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.tpl-property-ai-finder__hints {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}
.tpl-property-ai-finder__hint-chip {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 4px 10px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s, color 0.15s;
}
.tpl-property-ai-finder__hint-chip:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}
.tpl-property-ai-finder__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 22px;
  background: #f2cf4a;
  color: #002b54;
  border: none;
  border-radius: 999px;
  font-family: var(--tpl-font-sans);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  transition: background 0.2s, transform 0.2s;
  white-space: nowrap;
}
.tpl-property-ai-finder__btn:hover {
  background: #ffffff;
  transform: translateY(-2px);
}
`;
