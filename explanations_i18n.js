/* =========================================================================
 * NatiCoach — traductions des explications de RÉVISION (« Le savais-tu ? »).
 * Source FR = explanations.js (128 entrées). Ici : traductions par question,
 * toutes langues groupées ; un chargeur construit EXPLANATIONS_TR[langue][q].
 * Repli FR automatique si une entrée manque. NE concerne PAS la simulation d'examen.
 * Avancement : lot 1/7 (20/128).
 * ========================================================================= */
(function () {
  const E = [
    ["Quel est le plus grand canton suisse (superficie) ?", {
      en: "Graubünden (Grisons) is the largest canton by area, in the east of the country. It is also the only trilingual canton: German, Italian and Romansh.",
      pt: "Os Grisões (Graubünden) são o maior cantão em superfície, no leste do país. É também o único cantão trilingue: alemão, italiano e romanche.",
      es: "Los Grisones (Graubünden) son el cantón más grande en superficie, al este del país. Es también el único cantón trilingüe: alemán, italiano y romanche.",
      it: "I Grigioni (Graubünden) sono il cantone più grande per superficie, a est del Paese. È anche l'unico cantone trilingue: tedesco, italiano e romancio.",
      de: "Graubünden ist der flächenmässig grösste Kanton, im Osten des Landes. Es ist auch der einzige dreisprachige Kanton: Deutsch, Italienisch und Rätoromanisch.",
      sq: "Graubünden (Grishonët) është kantoni më i madh për nga sipërfaqja, në lindje të vendit. Është gjithashtu i vetmi kanton trigjuhësh: gjermanisht, italisht dhe retoromanisht." }],
    ["Combien y a-t-il de cantons en Suisse ?", {
      en: "Switzerland is a confederation of 26 cantons (including 6 « half-cantons »). Each canton has its own constitution, government and laws.",
      pt: "A Suíça é uma confederação de 26 cantões (incluindo 6 « meios-cantões »). Cada cantão tem a sua constituição, o seu governo e as suas leis.",
      es: "Suiza es una confederación de 26 cantones (incluidos 6 « semicantones »). Cada cantón tiene su constitución, su gobierno y sus leyes.",
      it: "La Svizzera è una confederazione di 26 cantoni (di cui 6 « semicantoni »). Ogni cantone ha la propria costituzione, il proprio governo e le proprie leggi.",
      de: "Die Schweiz ist eine Eidgenossenschaft aus 26 Kantonen (davon 6 « Halbkantone »). Jeder Kanton hat seine eigene Verfassung, Regierung und Gesetze.",
      sq: "Zvicra është një konfederatë me 26 kantone (përfshirë 6 « gjysmëkantone »). Çdo kanton ka kushtetutën, qeverinë dhe ligjet e veta." }],
    ["Quel est le plus grand lac entièrement suisse ?", {
      en: "Lake Neuchâtel is the largest lake entirely within Switzerland. Lake Geneva and Lake Constance are larger, but shared with France and Germany.",
      pt: "O lago de Neuchâtel é o maior lago inteiramente na Suíça. O Léman e o lago de Constança são maiores, mas partilhados com a França e a Alemanha.",
      es: "El lago de Neuchâtel es el mayor lago enteramente suizo. El Lemán y el lago de Constanza son mayores, pero compartidos con Francia y Alemania.",
      it: "Il lago di Neuchâtel è il più grande lago interamente in Svizzera. Il Lemano e il lago di Costanza sono più grandi, ma condivisi con Francia e Germania.",
      de: "Der Neuenburgersee ist der grösste vollständig in der Schweiz liegende See. Genfersee und Bodensee sind grösser, aber mit Frankreich und Deutschland geteilt.",
      sq: "Liqeni i Neuchâtel është liqeni më i madh tërësisht brenda Zvicrës. Léman dhe liqeni i Konstancës janë më të mëdhenj, por të ndarë me Francën dhe Gjermaninë." }],
    ["Quel canton est officiellement bilingue (deux langues officielles) ?", {
      en: "Fribourg is officially bilingual French–German (like Bern and Valais). The language border runs through the canton.",
      pt: "Friburgo é oficialmente bilingue francês–alemão (como Berna e o Valais). A fronteira linguística atravessa o cantão.",
      es: "Friburgo es oficialmente bilingüe francés–alemán (como Berna y el Valais). La frontera lingüística atraviesa el cantón.",
      it: "Friburgo è ufficialmente bilingue francese–tedesco (come Berna e il Vallese). Il confine linguistico attraversa il cantone.",
      de: "Freiburg ist offiziell zweisprachig Französisch–Deutsch (wie Bern und das Wallis). Die Sprachgrenze verläuft durch den Kanton.",
      sq: "Friburgu është zyrtarisht dygjuhësh frëngjisht–gjermanisht (si Berna dhe Valais). Kufiri gjuhësor e përshkon kantonin." }],
    ["La prairie du Grütli se trouve au bord du …", {
      en: "The Rütli meadow borders Lake Lucerne. It is the symbolic site of the founding oath of 1291.",
      pt: "O prado do Grütli fica junto ao lago de Lucerna. É o local simbólico do juramento fundador de 1291.",
      es: "La pradera del Rütli está a orillas del lago de los Cuatro Cantones. Es el lugar simbólico del juramento fundador de 1291.",
      it: "Il prato del Rütli si trova sul lago dei Quattro Cantoni. È il luogo simbolico del giuramento fondativo del 1291.",
      de: "Die Rütliwiese liegt am Vierwaldstättersee. Sie ist der symbolische Ort des Gründungsschwurs von 1291.",
      sq: "Livadhi i Rütli-t ndodhet buzë liqenit të Katër Kantoneve. Është vendi simbolik i betimit themelues të 1291." }],
    ["Combien y a-t-il d'habitants en Suisse ?", {
      en: "Switzerland has about 9 million inhabitants, of whom nearly a quarter are foreign residents.",
      pt: "A Suíça tem cerca de 9 milhões de habitantes, dos quais quase um quarto são residentes estrangeiros.",
      es: "Suiza tiene unos 9 millones de habitantes, de los cuales casi una cuarta parte son residentes extranjeros.",
      it: "La Svizzera conta circa 9 milioni di abitanti, di cui quasi un quarto sono residenti stranieri.",
      de: "Die Schweiz hat rund 9 Millionen Einwohner, davon fast ein Viertel ausländische Einwohner.",
      sq: "Zvicra ka rreth 9 milionë banorë, prej të cilëve gati një e katërta janë banorë të huaj." }],
    ["Le Palais fédéral se trouve à …", {
      en: "The Federal Palace, seat of the government and Parliament, is in Bern, the « federal city ».",
      pt: "O Palácio Federal, sede do governo e do Parlamento, fica em Berna, a « cidade federal ».",
      es: "El Palacio Federal, sede del gobierno y del Parlamento, está en Berna, la « ciudad federal ».",
      it: "Il Palazzo federale, sede del governo e del Parlamento, si trova a Berna, la « città federale ».",
      de: "Das Bundeshaus, Sitz von Regierung und Parlament, steht in Bern, der « Bundesstadt ».",
      sq: "Pallati Federal, selia e qeverisë dhe e Parlamentit, ndodhet në Bern, « qyteti federal »." }],
    ["On parle le romanche dans le canton …", {
      en: "Romansh, the 4th national language, is spoken in the canton of Graubünden. It is a Romance language derived from Latin.",
      pt: "O romanche, 4.ª língua nacional, é falado no cantão dos Grisões. É uma língua românica derivada do latim.",
      es: "El romanche, 4.ª lengua nacional, se habla en el cantón de los Grisones. Es una lengua románica derivada del latín.",
      it: "Il romancio, 4ª lingua nazionale, è parlato nel cantone dei Grigioni. È una lingua romanza derivata dal latino.",
      de: "Rätoromanisch, die 4. Landessprache, wird im Kanton Graubünden gesprochen. Es ist eine aus dem Lateinischen hervorgegangene romanische Sprache.",
      sq: "Retoromanishtja, gjuha e 4-t kombëtare, flitet në kantonin e Graubünden-it. Është një gjuhë romane e rrjedhur nga latinishtja." }],
    ["Quel pays n'a pas de frontière avec la Suisse ?", {
      en: "Belgium does not border Switzerland. The five neighbours are Germany, France, Italy, Austria and Liechtenstein.",
      pt: "A Bélgica não faz fronteira com a Suíça. Os cinco vizinhos são a Alemanha, a França, a Itália, a Áustria e o Liechtenstein.",
      es: "Bélgica no limita con Suiza. Los cinco vecinos son Alemania, Francia, Italia, Austria y Liechtenstein.",
      it: "Il Belgio non confina con la Svizzera. I cinque vicini sono Germania, Francia, Italia, Austria e Liechtenstein.",
      de: "Belgien grenzt nicht an die Schweiz. Die fünf Nachbarn sind Deutschland, Frankreich, Italien, Österreich und Liechtenstein.",
      sq: "Belgjika nuk kufizohet me Zvicrën. Pesë fqinjët janë Gjermania, Franca, Italia, Austria dhe Lihtenshtajni." }],
    ["Le lac Léman est situé en Suisse et en …", {
      en: "Lake Geneva is shared between Switzerland and France: its southern shore (Évian, Thonon) is French.",
      pt: "O lago Léman é partilhado entre a Suíça e a França: a sua margem sul (Évian, Thonon) é francesa.",
      es: "El lago Lemán es compartido entre Suiza y Francia: su orilla sur (Évian, Thonon) es francesa.",
      it: "Il lago Lemano è condiviso tra Svizzera e Francia: la sua sponda sud (Évian, Thonon) è francese.",
      de: "Der Genfersee wird von der Schweiz und Frankreich geteilt: sein Südufer (Évian, Thonon) ist französisch.",
      sq: "Liqeni Léman ndahet midis Zvicrës dhe Francës: bregu i tij jugor (Évian, Thonon) është francez." }],
    ["Quelle est la plus grande ville de Suisse ?", {
      en: "Zurich is the largest city in Switzerland and its main economic and financial centre — but it is not the capital.",
      pt: "Zurique é a maior cidade da Suíça e o seu principal centro económico e financeiro — mas não é a capital.",
      es: "Zúrich es la mayor ciudad de Suiza y su principal centro económico y financiero — pero no es la capital.",
      it: "Zurigo è la città più grande della Svizzera e il suo principale centro economico e finanziario — ma non è la capitale.",
      de: "Zürich ist die grösste Stadt der Schweiz und ihr wichtigstes Wirtschafts- und Finanzzentrum — aber nicht die Hauptstadt.",
      sq: "Cyrihu është qyteti më i madh i Zvicrës dhe qendra kryesore ekonomike e financiare — por nuk është kryeqyteti." }],
    ["Le plus haut sommet suisse est …", {
      en: "Dufourspitze (4634 m), in the Monte Rosa massif in Valais, is the highest point in Switzerland.",
      pt: "A Pointe Dufour (4634 m), no maciço do Monte Rosa, no Valais, é o ponto mais alto da Suíça.",
      es: "La Punta Dufour (4634 m), en el macizo del Monte Rosa, en el Valais, es el punto más alto de Suiza.",
      it: "La Punta Dufour (4634 m), nel massiccio del Monte Rosa in Vallese, è la vetta più alta della Svizzera.",
      de: "Die Dufourspitze (4634 m) im Monte-Rosa-Massiv im Wallis ist der höchste Punkt der Schweiz.",
      sq: "Maja Dufour (4634 m), në masivin e Monte Rosa-s në Valais, është pika më e lartë e Zvicrës." }],
    ["Le Cervin se trouve dans le canton …", {
      en: "The Matterhorn (4478 m) rises in Valais above Zermatt, on the Italian border. It is one of Switzerland's symbols.",
      pt: "O Matterhorn (Cervin, 4478 m) ergue-se no Valais acima de Zermatt, na fronteira italiana. É um dos símbolos da Suíça.",
      es: "El Cervino (Matterhorn, 4478 m) se alza en el Valais sobre Zermatt, en la frontera italiana. Es uno de los símbolos de Suiza.",
      it: "Il Cervino (Matterhorn, 4478 m) si erge in Vallese sopra Zermatt, al confine italiano. È uno dei simboli della Svizzera.",
      de: "Das Matterhorn (4478 m) erhebt sich im Wallis über Zermatt, an der italienischen Grenze. Es ist eines der Wahrzeichen der Schweiz.",
      sq: "Cervino (Matterhorn, 4478 m) ngrihet në Valais mbi Zermatt, në kufirin italian. Është një nga simbolet e Zvicrës." }],
    ["Le canton le plus au nord de la Suisse est …", {
      en: "Schaffhausen is the northernmost canton, largely on the right bank of the Rhine, surrounded by Germany. The Rhine Falls are there.",
      pt: "Schaffhausen é o cantão mais a norte, em grande parte na margem direita do Reno, rodeado pela Alemanha. Ali ficam as quedas do Reno.",
      es: "Schaffhausen es el cantón más al norte, en gran parte en la orilla derecha del Rin, rodeado por Alemania. Allí están las cataratas del Rin.",
      it: "Sciaffusa è il cantone più a nord, in gran parte sulla riva destra del Reno, circondato dalla Germania. Vi si trovano le cascate del Reno.",
      de: "Schaffhausen ist der nördlichste Kanton, grösstenteils am rechten Rheinufer, von Deutschland umgeben. Dort liegt der Rheinfall.",
      sq: "Schaffhausen është kantoni më verior, kryesisht në bregun e djathtë të Rinit, i rrethuar nga Gjermania. Aty ndodhet ujëvara e Rinit." }],
    ["Une de ces réponses n'indique pas une région naturelle de la Suisse. Laquelle ?", {
      en: "Piedmont is a region of Italy. Switzerland's three main natural regions are the Jura, the Plateau (Mittelland) and the Alps.",
      pt: "O Piemonte é uma região de Itália. As três grandes regiões naturais suíças são o Jura, o Planalto (Mittelland) e os Alpes.",
      es: "El Piamonte es una región de Italia. Las tres grandes regiones naturales suizas son el Jura, la Meseta (Mittelland) y los Alpes.",
      it: "Il Piemonte è una regione d'Italia. Le tre grandi regioni naturali svizzere sono il Giura, l'Altopiano (Mittelland) e le Alpi.",
      de: "Das Piemont ist eine Region Italiens. Die drei grossen Naturräume der Schweiz sind der Jura, das Mittelland und die Alpen.",
      sq: "Piemonti është një rajon i Italisë. Tri rajonet e mëdha natyrore të Zvicrës janë Jura, Platoja (Mittelland) dhe Alpet." }],
    ["Quelle est la capitale de la Suisse ?", {
      en: "Bern is de facto the capital (« federal city »). The Constitution does not mention a « capital », but Bern hosts the federal authorities.",
      pt: "Berna é de facto a capital (« cidade federal »). A Constituição não fala de « capital », mas Berna acolhe as autoridades federais.",
      es: "Berna es de hecho la capital (« ciudad federal »). La Constitución no habla de « capital », pero Berna acoge las autoridades federales.",
      it: "Berna è di fatto la capitale (« città federale »). La Costituzione non parla di « capitale », ma Berna ospita le autorità federali.",
      de: "Bern ist faktisch die Hauptstadt (« Bundesstadt »). Die Verfassung spricht nicht von einer « Hauptstadt », aber Bern beherbergt die Bundesbehörden.",
      sq: "Berna është de facto kryeqyteti (« qyteti federal »). Kushtetuta nuk flet për « kryeqytet », por Berna strehon autoritetet federale." }],
    ["Qui préside le Conseil fédéral en 2026 ?", {
      en: "The presidency of the Federal Council rotates each year among the 7 councillors; in 2026 it is held by Guy Parmelin. The president is only « first among equals ».",
      pt: "A presidência do Conselho Federal roda todos os anos entre os 7 conselheiros; em 2026 é exercida por Guy Parmelin. O presidente é apenas « primeiro entre pares ».",
      es: "La presidencia del Consejo Federal rota cada año entre los 7 consejeros; en 2026 la ejerce Guy Parmelin. El presidente es solo « primero entre iguales ».",
      it: "La presidenza del Consiglio federale ruota ogni anno tra i 7 consiglieri; nel 2026 è di Guy Parmelin. Il presidente è solo « primo tra pari ».",
      de: "Die Präsidentschaft des Bundesrats wechselt jedes Jahr unter den 7 Räten; 2026 hat sie Guy Parmelin inne. Der Präsident ist nur « Erster unter Gleichen ».",
      sq: "Presidenca e Këshillit Federal rrotullohet çdo vit mes 7 këshilltarëve; në 2026 e mban Guy Parmelin. Presidenti është vetëm « i pari ndër të barabartë »." }],
    ["Combien de membres compte le Conseil fédéral ?", {
      en: "The Federal Council (government) has 7 members, elected by Parliament, who decide collegially.",
      pt: "O Conselho Federal (governo) tem 7 membros, eleitos pelo Parlamento, que decidem de forma colegial.",
      es: "El Consejo Federal (gobierno) tiene 7 miembros, elegidos por el Parlamento, que deciden de forma colegiada.",
      it: "Il Consiglio federale (governo) ha 7 membri, eletti dal Parlamento, che decidono in modo collegiale.",
      de: "Der Bundesrat (Regierung) hat 7 Mitglieder, die vom Parlament gewählt werden und kollegial entscheiden.",
      sq: "Këshilli Federal (qeveria) ka 7 anëtarë, të zgjedhur nga Parlamenti, që vendosin në mënyrë kolegjiale." }],
    ["Pour combien de temps est élu/e le/la président/e de la Confédération ?", {
      en: "The President of the Confederation is elected for 1 year only, in turn. There is no single, permanent head of state.",
      pt: "O Presidente da Confederação é eleito apenas por 1 ano, à vez. Não há um chefe de Estado único e permanente.",
      es: "El Presidente de la Confederación es elegido solo por 1 año, por turnos. No hay un jefe de Estado único y permanente.",
      it: "Il Presidente della Confederazione è eletto per 1 solo anno, a rotazione. Non c'è un capo di Stato unico e permanente.",
      de: "Der Bundespräsident wird nur für 1 Jahr gewählt, im Turnus. Es gibt kein einzelnes, dauerhaftes Staatsoberhaupt.",
      sq: "Presidenti i Konfederatës zgjidhet vetëm për 1 vit, me radhë. Nuk ka një kryetar shteti të vetëm e të përhershëm." }],
    ["Quels sont les 3 pouvoirs du système politique en Suisse ?", {
      en: "The separation of powers: the legislative (Parliament) makes the laws, the executive (Federal Council) applies them, the judiciary (courts) judges.",
      pt: "A separação de poderes: o legislativo (Parlamento) faz as leis, o executivo (Conselho Federal) aplica-as, o judiciário (tribunais) julga.",
      es: "La separación de poderes: el legislativo (Parlamento) hace las leyes, el ejecutivo (Consejo Federal) las aplica, el judicial (tribunales) juzga.",
      it: "La separazione dei poteri: il legislativo (Parlamento) fa le leggi, l'esecutivo (Consiglio federale) le applica, il giudiziario (tribunali) giudica.",
      de: "Die Gewaltenteilung: die Legislative (Parlament) macht die Gesetze, die Exekutive (Bundesrat) wendet sie an, die Judikative (Gerichte) richtet.",
      sq: "Ndarja e pushteteve: legjislativi (Parlamenti) bën ligjet, ekzekutivi (Këshilli Federal) i zbaton, gjyqësori (gjykatat) gjykon." }],
  ];
  const TR = { en: {}, pt: {}, es: {}, it: {}, de: {}, sq: {} };
  E.forEach(function (row) { const q = row[0], t = row[1]; for (const l in t) if (TR[l]) TR[l][q] = t[l]; });
  window.EXPLANATIONS_TR = TR;
})();
