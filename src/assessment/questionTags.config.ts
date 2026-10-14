// Every word list used by the rule-based checks, in one place so they can be tuned against
// hand-labelled messages (WP8). All entries are lowercase.

/** Common words left out when comparing what two texts are about. */
export const STOPWORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any", "are", "as", "at", "be", "because",
  "been", "before", "being", "but", "by", "can", "could", "did", "do", "does", "doing", "don't", "for", "from",
  "get", "got", "had", "has", "have", "having", "he", "her", "here", "him", "his", "how", "i", "i'd", "i'm",
  "if", "in", "into", "is", "it", "it's", "its", "just", "know", "let", "like", "me", "more", "most", "my",
  "no", "not", "now", "of", "on", "one", "only", "or", "other", "our", "out", "really", "right", "say", "she",
  "so", "some", "still", "such", "tell", "than", "that", "that's", "the", "their", "them", "then", "there",
  "these", "they", "they're", "thing", "things", "think", "this", "those", "to", "too", "up", "us", "very",
  "was", "we", "we're", "well", "were", "what", "what's", "when", "where", "which", "while", "who", "why",
  "will", "with", "would", "yes", "you", "you're", "your",
]);
