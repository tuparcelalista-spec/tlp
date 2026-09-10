import { tplTokensCss } from "../tokens";
import { tplFoundationCss } from "./foundation";
import { containerCss } from "../components/Container/Container.css";
import { sectionCss } from "../components/Section/Section.css";
import { gridCss } from "../components/Grid/Grid.css";
import { cardCss } from "../components/Card/Card.css";
import { propertyImageCss } from "../components/Media/PropertyImage.css";
import { badgeCss } from "../components/Badge/Badge.css";
import { propertyDataCss } from "../components/PropertyData/PropertyData.css";
import { propertyCardCss } from "../components/PropertyCard/PropertyCard.css";
import { buttonCss } from "../components/Button/Button.css";
import { inputCss } from "../components/Input/Input.css";
import { selectCss } from "../components/Select/Select.css";
import { searchBarCss } from "../components/SearchBar/SearchBar.css";
import { filterCss } from "../components/Filter/Filter.css";
import { statesCss } from "../components/States/States.css";
import { headerCss } from "../components/Header/Header.css";
import { footerCss } from "../components/Footer/Footer.css";

/**
 * Se renderiza UNA vez por app (en el layout raíz), como reemplazo directo
 * del único `<link rel="stylesheet" href="tpl-foundation.css">` que hoy
 * cargan todas las páginas de frontend-v2. Inyecta tokens + fundación +
 * el CSS de cada componente del sistema, en ese orden (cascada predecible:
 * layout → primitivos de contenido → primitivos de formulario → Header/Footer).
 *
 * Con ~20 componentes esta lista ya es el límite razonable de "agregarlo a
 * mano" — el próximo componente nuevo debería evaluar si toca pasar a que
 * cada uno inyecte su propio `<style>` co-ubicado (ver README §Deuda técnica).
 */
export function TplDesignSystemStyles() {
  return (
    <style>
      {[
        tplTokensCss,
        tplFoundationCss,
        containerCss,
        sectionCss,
        gridCss,
        cardCss,
        propertyImageCss,
        badgeCss,
        propertyDataCss,
        propertyCardCss,
        buttonCss,
        inputCss,
        selectCss,
        searchBarCss,
        filterCss,
        statesCss,
        headerCss,
        footerCss,
      ].join("\n")}
    </style>
  );
}
