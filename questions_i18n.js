/* =========================================================================
 * NatiCoach — traductions OPTIONNELLES des questions (aide à la compréhension).
 *
 * Les questions officielles restent en FRANÇAIS (l'examen se passe en français).
 * Ce fichier permet, « dans un second temps », d'afficher une traduction SOUS
 * la question française (bouton « Voir la traduction »), sans jamais la remplacer.
 *
 * Structure : window.QUESTION_TR[langue][texte_français_exact_de_la_question] = {
 *     q: "traduction de la question",
 *     options: ["…", "…"]   // (facultatif) mêmes indices que la question FR
 *   }
 *
 * Rempli à la demande — vide par défaut (aucune traduction = aucun bouton affiché).
 * Exemple :
 *   window.QUESTION_TR.pt["Quelle est la capitale de la Suisse ?"] =
 *     { q: "Qual é a capital da Suíça?" };
 * ========================================================================= */
window.QUESTION_TR = {
  fr: {},
  en: {},
  pt: {},
  es: {},
  it: {},
  de: {},
  sq: {},
};
