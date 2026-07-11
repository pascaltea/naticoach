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
    ["Le Cervin se trouve dans le canton …", {
      en: { q: "The Matterhorn is in the canton …", options: ["of Neuchâtel", "of Geneva", "of Valais", "of Vaud"] },
      pt: { q: "O Matterhorn está no cantão …", options: ["de Neuchâtel", "de Genebra", "do Valais", "de Vaud"] },
      es: { q: "El Cervino está en el cantón …", options: ["de Neuchâtel", "de Ginebra", "del Valais", "de Vaud"] },
      it: { q: "Il Cervino si trova nel cantone …", options: ["di Neuchâtel", "di Ginevra", "del Vallese", "di Vaud"] },
      de: { q: "Das Matterhorn liegt im Kanton …", options: ["Neuenburg", "Genf", "Wallis", "Waadt"] },
      sq: { q: "Cervino ndodhet në kantonin …", options: ["e Neuchâtel", "e Gjenevës", "e Valais", "e Vaud"] } }],
    ["Le canton le plus au nord de la Suisse est …", {
      en: { q: "The northernmost canton of Switzerland is …", options: ["Grisons", "Basel", "Uri", "Schaffhausen"] },
      pt: { q: "O cantão mais a norte da Suíça é …", options: ["Grisões", "Basileia", "Uri", "Schaffhausen"] },
      es: { q: "El cantón más al norte de Suiza es …", options: ["Grisones", "Basilea", "Uri", "Schaffhausen"] },
      it: { q: "Il cantone più a nord della Svizzera è …", options: ["Grigioni", "Basilea", "Uri", "Sciaffusa"] },
      de: { q: "Der nördlichste Kanton der Schweiz ist …", options: ["Graubünden", "Basel", "Uri", "Schaffhausen"] },
      sq: { q: "Kantoni më verior i Zvicrës është …", options: ["Graubünden", "Bazel", "Uri", "Schaffhausen"] } }],
    ["Une de ces réponses n'indique pas une région naturelle de la Suisse. Laquelle ?", {
      en: { q: "One of these answers is not a natural region of Switzerland. Which one?", options: ["Jura", "Alps", "Piedmont", "Plateau"] },
      pt: { q: "Uma destas respostas não indica uma região natural da Suíça. Qual?", options: ["Jura", "Alpes", "Piemonte", "Planalto"] },
      es: { q: "Una de estas respuestas no indica una región natural de Suiza. ¿Cuál?", options: ["Jura", "Alpes", "Piamonte", "Meseta"] },
      it: { q: "Una di queste risposte non indica una regione naturale della Svizzera. Quale?", options: ["Giura", "Alpi", "Piemonte", "Altopiano"] },
      de: { q: "Eine dieser Antworten ist keine Naturregion der Schweiz. Welche?", options: ["Jura", "Alpen", "Piemont", "Mittelland"] },
      sq: { q: "Një nga këto përgjigje nuk tregon një rajon natyror të Zvicrës. Cila?", options: ["Jura", "Alpet", "Piemonti", "Plateja"] } }],
    ["Quelle est la capitale de la Suisse ?", {
      en: { q: "What is the capital of Switzerland?", options: ["Zurich", "Basel", "Geneva", "Bern"] },
      pt: { q: "Qual é a capital da Suíça?", options: ["Zurique", "Basileia", "Genebra", "Berna"] },
      es: { q: "¿Cuál es la capital de Suiza?", options: ["Zúrich", "Basilea", "Ginebra", "Berna"] },
      it: { q: "Qual è la capitale della Svizzera?", options: ["Zurigo", "Basilea", "Ginevra", "Berna"] },
      de: { q: "Was ist die Hauptstadt der Schweiz?", options: ["Zürich", "Basel", "Genf", "Bern"] },
      sq: { q: "Cili është kryeqyteti i Zvicrës?", options: ["Cyrih", "Bazel", "Gjenevë", "Bern"] } }],
    ["Qui préside le Conseil fédéral en 2026 ?", {
      en: { q: "Who presides over the Federal Council in 2026?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] },
      pt: { q: "Quem preside o Conselho Federal em 2026?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] },
      es: { q: "¿Quién preside el Consejo Federal en 2026?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] },
      it: { q: "Chi presiede il Consiglio federale nel 2026?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] },
      de: { q: "Wer präsidiert 2026 den Bundesrat?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] },
      sq: { q: "Kush kryeson Këshillin Federal në 2026?", options: ["Guy Parmelin", "Karin Keller-Sutter", "Beat Jans", "Ignazio Cassis"] } }],
    ["Combien de membres compte le Conseil fédéral ?", {
      en: { q: "How many members does the Federal Council have?", options: ["7", "5", "8", "9"] },
      pt: { q: "Quantos membros tem o Conselho Federal?", options: ["7", "5", "8", "9"] },
      es: { q: "¿Cuántos miembros tiene el Consejo Federal?", options: ["7", "5", "8", "9"] },
      it: { q: "Quanti membri ha il Consiglio federale?", options: ["7", "5", "8", "9"] },
      de: { q: "Wie viele Mitglieder hat der Bundesrat?", options: ["7", "5", "8", "9"] },
      sq: { q: "Sa anëtarë ka Këshilli Federal?", options: ["7", "5", "8", "9"] } }],
    ["Pour combien de temps est élu/e le/la président/e de la Confédération ?", {
      en: { q: "For how long is the President of the Confederation elected?", options: ["4 years", "5 years", "1 year", "2 years"] },
      pt: { q: "Por quanto tempo é eleito/a o/a presidente da Confederação?", options: ["4 anos", "5 anos", "1 ano", "2 anos"] },
      es: { q: "¿Por cuánto tiempo se elige al presidente/a de la Confederación?", options: ["4 años", "5 años", "1 año", "2 años"] },
      it: { q: "Per quanto tempo è eletto/a il/la presidente della Confederazione?", options: ["4 anni", "5 anni", "1 anno", "2 anni"] },
      de: { q: "Für wie lange wird der/die Bundespräsident/in gewählt?", options: ["4 Jahre", "5 Jahre", "1 Jahr", "2 Jahre"] },
      sq: { q: "Për sa kohë zgjidhet presidenti/ja i/e Konfederatës?", options: ["4 vjet", "5 vjet", "1 vit", "2 vjet"] } }],
    ["Quels sont les 3 pouvoirs du système politique en Suisse ?", {
      en: { q: "What are the 3 powers of the Swiss political system?", options: ["Legislative, executive, judicial", "Parliamentary, civil, religious", "Union, media, judicial", "Legislative, religious, union"] },
      pt: { q: "Quais são os 3 poderes do sistema político suíço?", options: ["Legislativo, executivo, judicial", "Parlamentar, civil, religioso", "Sindical, mediático, judicial", "Legislativo, religioso, sindical"] },
      es: { q: "¿Cuáles son los 3 poderes del sistema político suizo?", options: ["Legislativo, ejecutivo, judicial", "Parlamentario, civil, religioso", "Sindical, mediático, judicial", "Legislativo, religioso, sindical"] },
      it: { q: "Quali sono i 3 poteri del sistema politico svizzero?", options: ["Legislativo, esecutivo, giudiziario", "Parlamentare, civile, religioso", "Sindacale, mediatico, giudiziario", "Legislativo, religioso, sindacale"] },
      de: { q: "Was sind die 3 Gewalten des politischen Systems der Schweiz?", options: ["Legislative, Exekutive, Judikative", "Parlamentarisch, zivil, religiös", "Gewerkschaftlich, medial, judikativ", "Legislative, religiös, gewerkschaftlich"] },
      sq: { q: "Cilat janë 3 pushtetet e sistemit politik në Zvicër?", options: ["Legjislativ, ekzekutiv, gjyqësor", "Parlamentar, civil, fetar", "Sindikal, mediatik, gjyqësor", "Legjislativ, fetar, sindikal"] } }],
    ["Les citoyens peuvent demander une consultation populaire (votation) sur un nouveau texte de loi par …", {
      en: { q: "Citizens can call for a popular vote on a new law through …", options: ["lobbying", "a demonstration", "a referendum", "a strike"] },
      pt: { q: "Os cidadãos podem pedir uma consulta popular sobre uma nova lei através …", options: ["do lobbying", "de uma manifestação", "de um referendo", "de uma greve"] },
      es: { q: "Los ciudadanos pueden pedir una consulta popular sobre una nueva ley mediante …", options: ["el lobbying", "una manifestación", "un referéndum", "una huelga"] },
      it: { q: "I cittadini possono chiedere una votazione popolare su una nuova legge tramite …", options: ["il lobbying", "una manifestazione", "un referendum", "uno sciopero"] },
      de: { q: "Bürger können über ein neues Gesetz eine Volksabstimmung verlangen durch …", options: ["Lobbying", "eine Demonstration", "ein Referendum", "einen Streik"] },
      sq: { q: "Qytetarët mund të kërkojnë një votim popullor për një ligj të ri përmes …", options: ["lobimit", "një demonstrate", "një referendumi", "një greve"] } }],
    ["Quelle chambre du Parlement fédéral représente le peuple ?", {
      en: { q: "Which chamber of the federal Parliament represents the people?", options: ["The National Council", "The Council of States", "The Federal Council", "The Grand Council"] },
      pt: { q: "Que câmara do Parlamento federal representa o povo?", options: ["O Conselho Nacional", "O Conselho dos Estados", "O Conselho Federal", "O Grande Conselho"] },
      es: { q: "¿Qué cámara del Parlamento federal representa al pueblo?", options: ["El Consejo Nacional", "El Consejo de los Estados", "El Consejo Federal", "El Gran Consejo"] },
      it: { q: "Quale camera del Parlamento federale rappresenta il popolo?", options: ["Il Consiglio nazionale", "Il Consiglio degli Stati", "Il Consiglio federale", "Il Gran Consiglio"] },
      de: { q: "Welche Kammer des Bundesparlaments vertritt das Volk?", options: ["Der Nationalrat", "Der Ständerat", "Der Bundesrat", "Der Grosse Rat"] },
      sq: { q: "Cila dhomë e Parlamentit federal përfaqëson popullin?", options: ["Këshilli Kombëtar", "Këshilli i Shteteve", "Këshilli Federal", "Këshilli i Madh"] } }],
    ["Le Palais fédéral est le siège …", {
      en: { q: "The Federal Palace is the seat …", options: ["of the Swiss National Museum", "of Parliament", "of the University", "of Swiss Television"] },
      pt: { q: "O Palácio Federal é a sede …", options: ["do Museu Nacional Suíço", "do Parlamento", "da Universidade", "da Televisão Suíça"] },
      es: { q: "El Palacio Federal es la sede …", options: ["del Museo Nacional Suizo", "del Parlamento", "de la Universidad", "de la Televisión Suiza"] },
      it: { q: "Il Palazzo federale è la sede …", options: ["del Museo nazionale svizzero", "del Parlamento", "dell'Università", "della Televisione svizzera"] },
      de: { q: "Das Bundeshaus ist der Sitz …", options: ["des Schweizerischen Nationalmuseums", "des Parlaments", "der Universität", "des Schweizer Fernsehens"] },
      sq: { q: "Pallati Federal është selia …", options: ["e Muzeut Kombëtar Zviceran", "e Parlamentit", "e Universitetit", "e Televizionit Zviceran"] } }],
    ["Dans quel texte de loi suisse se trouvent les droits fondamentaux ?", {
      en: { q: "In which Swiss legal text are the fundamental rights found?", options: ["Criminal Code", "Constitution", "Civil Code", "Communal regulation"] },
      pt: { q: "Em que texto de lei suíço se encontram os direitos fundamentais?", options: ["Código Penal", "Constituição", "Código Civil", "Regulamento municipal"] },
      es: { q: "¿En qué texto legal suizo se encuentran los derechos fundamentales?", options: ["Código Penal", "Constitución", "Código Civil", "Reglamento municipal"] },
      it: { q: "In quale testo di legge svizzero si trovano i diritti fondamentali?", options: ["Codice penale", "Costituzione", "Codice civile", "Regolamento comunale"] },
      de: { q: "In welchem Schweizer Gesetzestext stehen die Grundrechte?", options: ["Strafgesetzbuch", "Verfassung", "Zivilgesetzbuch", "Gemeindereglement"] },
      sq: { q: "Në cilin tekst ligjor zviceran gjenden të drejtat themelore?", options: ["Kodi penal", "Kushtetuta", "Kodi civil", "Rregullorja komunale"] } }],
    ["Qui élit les membres du Tribunal fédéral ?", {
      en: { q: "Who elects the members of the Federal Supreme Court?", options: ["the Federal Council", "the Federal Assembly", "the people and the cantons", "the municipalities"] },
      pt: { q: "Quem elege os membros do Tribunal Federal?", options: ["o Conselho Federal", "a Assembleia Federal", "o povo e os cantões", "os municípios"] },
      es: { q: "¿Quién elige a los miembros del Tribunal Federal?", options: ["el Consejo Federal", "la Asamblea Federal", "el pueblo y los cantones", "los municipios"] },
      it: { q: "Chi elegge i membri del Tribunale federale?", options: ["il Consiglio federale", "l'Assemblea federale", "il popolo e i cantoni", "i comuni"] },
      de: { q: "Wer wählt die Mitglieder des Bundesgerichts?", options: ["der Bundesrat", "die Bundesversammlung", "das Volk und die Kantone", "die Gemeinden"] },
      sq: { q: "Kush zgjedh anëtarët e Gjykatës Federale?", options: ["Këshilli Federal", "Asambleja Federale", "populli dhe kantonet", "komunat"] } }],
    ["La Suisse est gouvernée par…", {
      en: { q: "Switzerland is governed by…", options: ["A Federal Council", "A President", "A King", "A Prime Minister"] },
      pt: { q: "A Suíça é governada por…", options: ["Um Conselho Federal", "Um Presidente", "Um Rei", "Um Primeiro-Ministro"] },
      es: { q: "Suiza está gobernada por…", options: ["Un Consejo Federal", "Un Presidente", "Un Rey", "Un Primer Ministro"] },
      it: { q: "La Svizzera è governata da…", options: ["Un Consiglio federale", "Un Presidente", "Un Re", "Un Primo ministro"] },
      de: { q: "Die Schweiz wird regiert von…", options: ["Einem Bundesrat", "Einem Präsidenten", "Einem König", "Einem Premierminister"] },
      sq: { q: "Zvicra qeveriset nga…", options: ["Një Këshill Federal", "Një President", "Një Mbret", "Një Kryeministër"] } }],
  ];
  Q.forEach(function (row) { const f = row[0], t = row[1]; for (const l in t) if (window.QUESTION_TR[l]) window.QUESTION_TR[l][f] = t[l]; });
})();
