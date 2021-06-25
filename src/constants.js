export const SERVER_URL = "https://cards-against-steve.herokuapp.com";

export const CLIENT_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "cards-of-personality-gatheract.netlify.app";

export const MAX_PLAYERS = 8;
