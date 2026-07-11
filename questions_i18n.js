/* =========================================================================
 * NatiCoach — traductions OPTIONNELLES des questions de RÉVISION.
 * Les questions officielles restent en FRANÇAIS (l'examen se passe en français) ;
 * ces traductions s'affichent seulement en révision, sous un bouton
 * « Voir la traduction ». JAMAIS dans la vraie simulation d'examen.
 * Clé = texte FR exact de la question ; valeur = { q, options[] } (même ordre FR).
 * Structure : tableau Q (toutes langues groupées) + chargeur.
 * Avancement : lot 1 (12/128).
 * ========================================================================= */
window.QUESTION_TR = { fr: {}, en: {}, pt: {}, es: {}, it: {}, de: {}, sq: {} };
(function () {
  const Q = [
    ["Quel est le plus grand canton suisse (superficie) ?", {
      en: { q: "What is the largest Swiss canton (by area)?", options: ["Zurich", "Grisons", "Valais", "Vaud"] },
      pt: { q: "Qual é o maior cantão suíço (em superfície)?", options: ["Zurique", "Grisões", "Valais", "Vaud"] },
      es: { q: "¿Cuál es el cantón suizo más grande (en superficie)?", options: ["Zúrich", "Grisones", "Valais", "Vaud"] },
      it: { q: "Qual è il cantone svizzero più grande (per superficie)?", options: ["Zurigo", "Grigioni", "Vallese", "Vaud"] },
      de: { q: "Welches ist der grösste Schweizer Kanton (Fläche)?", options: ["Zürich", "Graubünden", "Wallis", "Waadt"] },
      sq: { q: "Cili është kantoni më i madh zviceran (sipërfaqja)?", options: ["Cyrih", "Graubünden", "Valais", "Vaud"] } }],
    ["Combien y a-t-il de cantons en Suisse ?", {
      en: { q: "How many cantons are there in Switzerland?", options: ["26", "28", "25", "23"] },
      pt: { q: "Quantos cantões há na Suíça?", options: ["26", "28", "25", "23"] },
      es: { q: "¿Cuántos cantones hay en Suiza?", options: ["26", "28", "25", "23"] },
      it: { q: "Quanti cantoni ci sono in Svizzera?", options: ["26", "28", "25", "23"] },
      de: { q: "Wie viele Kantone gibt es in der Schweiz?", options: ["26", "28", "25", "23"] },
      sq: { q: "Sa kantone ka në Zvicër?", options: ["26", "28", "25", "23"] } }],
    ["Quel est le plus grand lac entièrement suisse ?", {
      en: { q: "What is the largest lake entirely within Switzerland?", options: ["Lake Geneva", "Lake Neuchâtel", "Lake Maggiore", "Lake Zurich"] },
      pt: { q: "Qual é o maior lago inteiramente suíço?", options: ["Lago Léman", "Lago de Neuchâtel", "Lago Maior", "Lago de Zurique"] },
      es: { q: "¿Cuál es el mayor lago enteramente suizo?", options: ["Lago Lemán", "Lago de Neuchâtel", "Lago Mayor", "Lago de Zúrich"] },
      it: { q: "Qual è il più grande lago interamente svizzero?", options: ["Lago Lemano", "Lago di Neuchâtel", "Lago Maggiore", "Lago di Zurigo"] },
      de: { q: "Welches ist der grösste vollständig schweizerische See?", options: ["Genfersee", "Neuenburgersee", "Lago Maggiore", "Zürichsee"] },
      sq: { q: "Cili është liqeni më i madh tërësisht zviceran?", options: ["Liqeni Léman", "Liqeni i Neuchâtel", "Liqeni Maggiore", "Liqeni i Cyrihut"] } }],
    ["Quel canton est officiellement bilingue (deux langues officielles) ?", {
      en: { q: "Which canton is officially bilingual (two official languages)?", options: ["Geneva", "Basel", "Vaud", "Fribourg"] },
      pt: { q: "Qual cantão é oficialmente bilingue (duas línguas oficiais)?", options: ["Genebra", "Basileia", "Vaud", "Friburgo"] },
      es: { q: "¿Qué cantón es oficialmente bilingüe (dos lenguas oficiales)?", options: ["Ginebra", "Basilea", "Vaud", "Friburgo"] },
      it: { q: "Quale cantone è ufficialmente bilingue (due lingue ufficiali)?", options: ["Ginevra", "Basilea", "Vaud", "Friburgo"] },
      de: { q: "Welcher Kanton ist offiziell zweisprachig (zwei Amtssprachen)?", options: ["Genf", "Basel", "Waadt", "Freiburg"] },
      sq: { q: "Cili kanton është zyrtarisht dygjuhësh (dy gjuhë zyrtare)?", options: ["Gjenevë", "Bazel", "Vaud", "Friburg"] } }],
    ["La prairie du Grütli se trouve au bord du …", {
      en: { q: "The Rütli meadow lies by the …", options: ["Lake Biel", "Lake Constance", "Lake Zurich", "Lake Lucerne"] },
      pt: { q: "O prado do Grütli fica junto ao …", options: ["Lago de Bienne", "Lago de Constança", "Lago de Zurique", "Lago dos Quatro Cantões"] },
      es: { q: "La pradera del Rütli está a orillas del …", options: ["Lago de Biel", "Lago de Constanza", "Lago de Zúrich", "Lago de los Cuatro Cantones"] },
      it: { q: "Il prato del Rütli si trova sul …", options: ["Lago di Bienne", "Lago di Costanza", "Lago di Zurigo", "Lago dei Quattro Cantoni"] },
      de: { q: "Die Rütliwiese liegt am …", options: ["Bielersee", "Bodensee", "Zürichsee", "Vierwaldstättersee"] },
      sq: { q: "Livadhi i Rütli-t ndodhet buzë …", options: ["Liqenit të Bienne", "Liqenit të Konstancës", "Liqenit të Cyrihut", "Liqenit të Katër Kantoneve"] } }],
    ["Combien y a-t-il d'habitants en Suisse ?", {
      en: { q: "How many inhabitants does Switzerland have?", options: ["About 10 million", "About 6 million", "About 5 million", "About 9 million"] },
      pt: { q: "Quantos habitantes tem a Suíça?", options: ["Cerca de 10 milhões", "Cerca de 6 milhões", "Cerca de 5 milhões", "Cerca de 9 milhões"] },
      es: { q: "¿Cuántos habitantes tiene Suiza?", options: ["Unos 10 millones", "Unos 6 millones", "Unos 5 millones", "Unos 9 millones"] },
      it: { q: "Quanti abitanti ha la Svizzera?", options: ["Circa 10 milioni", "Circa 6 milioni", "Circa 5 milioni", "Circa 9 milioni"] },
      de: { q: "Wie viele Einwohner hat die Schweiz?", options: ["Etwa 10 Millionen", "Etwa 6 Millionen", "Etwa 5 Millionen", "Etwa 9 Millionen"] },
      sq: { q: "Sa banorë ka Zvicra?", options: ["Rreth 10 milionë", "Rreth 6 milionë", "Rreth 5 milionë", "Rreth 9 milionë"] } }],
    ["Le Palais fédéral se trouve à …", {
      en: { q: "The Federal Palace is located in …", options: ["Zurich", "Fribourg", "Bern", "Lucerne"] },
      pt: { q: "O Palácio Federal fica em …", options: ["Zurique", "Friburgo", "Berna", "Lucerna"] },
      es: { q: "El Palacio Federal está en …", options: ["Zúrich", "Friburgo", "Berna", "Lucerna"] },
      it: { q: "Il Palazzo federale si trova a …", options: ["Zurigo", "Friburgo", "Berna", "Lucerna"] },
      de: { q: "Das Bundeshaus befindet sich in …", options: ["Zürich", "Freiburg", "Bern", "Luzern"] },
      sq: { q: "Pallati Federal ndodhet në …", options: ["Cyrih", "Friburg", "Bern", "Lucernë"] } }],
    ["On parle le romanche dans le canton …", {
      en: { q: "Romansh is spoken in the canton …", options: ["of St. Gallen", "of Valais", "of Uri", "of Graubünden"] },
      pt: { q: "O romanche fala-se no cantão …", options: ["de São Galo", "do Valais", "de Uri", "dos Grisões"] },
      es: { q: "El romanche se habla en el cantón …", options: ["de San Galo", "del Valais", "de Uri", "de los Grisones"] },
      it: { q: "Il romancio si parla nel cantone …", options: ["di San Gallo", "del Vallese", "di Uri", "dei Grigioni"] },
      de: { q: "Rätoromanisch spricht man im Kanton …", options: ["St. Gallen", "Wallis", "Uri", "Graubünden"] },
      sq: { q: "Retoromanishtja flitet në kantonin …", options: ["e San Galit", "e Valais", "e Uri-t", "e Graubünden-it"] } }],
    ["Quel pays n'a pas de frontière avec la Suisse ?", {
      en: { q: "Which country does not border Switzerland?", options: ["Italy", "Belgium", "France", "Germany"] },
      pt: { q: "Que país não faz fronteira com a Suíça?", options: ["Itália", "Bélgica", "França", "Alemanha"] },
      es: { q: "¿Qué país no limita con Suiza?", options: ["Italia", "Bélgica", "Francia", "Alemania"] },
      it: { q: "Quale Paese non confina con la Svizzera?", options: ["Italia", "Belgio", "Francia", "Germania"] },
      de: { q: "Welches Land grenzt nicht an die Schweiz?", options: ["Italien", "Belgien", "Frankreich", "Deutschland"] },
      sq: { q: "Cili vend nuk kufizohet me Zvicrën?", options: ["Italia", "Belgjika", "Franca", "Gjermania"] } }],
    ["Le lac Léman est situé en Suisse et en …", {
      en: { q: "Lake Geneva lies in Switzerland and in …", options: ["France", "Italy", "Austria", "Germany"] },
      pt: { q: "O lago Léman situa-se na Suíça e em …", options: ["França", "Itália", "Áustria", "Alemanha"] },
      es: { q: "El lago Lemán se sitúa en Suiza y en …", options: ["Francia", "Italia", "Austria", "Alemania"] },
      it: { q: "Il lago Lemano si trova in Svizzera e in …", options: ["Francia", "Italia", "Austria", "Germania"] },
      de: { q: "Der Genfersee liegt in der Schweiz und in …", options: ["Frankreich", "Italien", "Österreich", "Deutschland"] },
      sq: { q: "Liqeni Léman ndodhet në Zvicër dhe në …", options: ["Francë", "Itali", "Austri", "Gjermani"] } }],
    ["Quelle est la plus grande ville de Suisse ?", {
      en: { q: "What is the largest city in Switzerland?", options: ["Geneva", "Bern", "Zurich", "Basel"] },
      pt: { q: "Qual é a maior cidade da Suíça?", options: ["Genebra", "Berna", "Zurique", "Basileia"] },
      es: { q: "¿Cuál es la mayor ciudad de Suiza?", options: ["Ginebra", "Berna", "Zúrich", "Basilea"] },
      it: { q: "Qual è la città più grande della Svizzera?", options: ["Ginevra", "Berna", "Zurigo", "Basilea"] },
      de: { q: "Welches ist die grösste Stadt der Schweiz?", options: ["Genf", "Bern", "Zürich", "Basel"] },
      sq: { q: "Cili është qyteti më i madh i Zvicrës?", options: ["Gjenevë", "Bern", "Cyrih", "Bazel"] } }],
    ["Le plus haut sommet suisse est …", {
      en: { q: "The highest Swiss peak is …", options: ["The Dent Blanche", "The Dufourspitze", "The Matterhorn", "The Jungfrau"] },
      pt: { q: "O ponto mais alto da Suíça é …", options: ["A Dent Blanche", "A Pointe Dufour", "O Matterhorn", "A Jungfrau"] },
      es: { q: "La cima más alta de Suiza es …", options: ["La Dent Blanche", "La Punta Dufour", "El Cervino", "La Jungfrau"] },
      it: { q: "La vetta più alta della Svizzera è …", options: ["La Dent Blanche", "La Punta Dufour", "Il Cervino", "La Jungfrau"] },
      de: { q: "Der höchste Gipfel der Schweiz ist …", options: ["Die Dent Blanche", "Die Dufourspitze", "Das Matterhorn", "Die Jungfrau"] },
      sq: { q: "Maja më e lartë e Zvicrës është …", options: ["Dent Blanche", "Maja Dufour", "Cervino", "Jungfrau"] } }],
  ];
  Q.forEach(function (row) { const f = row[0], t = row[1]; for (const l in t) if (window.QUESTION_TR[l]) window.QUESTION_TR[l][f] = t[l]; });
})();
