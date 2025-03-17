
const urlRoot = window.location.origin;
const apiPath = "/api";
const staticDir = "/static";
const intraLoginUrl = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-106ab599e58a35bf00e2a4e2a3f6af8f27a450ca5e30e1c6643e1f78b68d65ae&response_type=code&redirect_uri=" + encodeURIComponent(urlRoot);
let intraCode;
let JWTs;
let TOTPSetup;
let tetrisActive = false;
let GlobalMatchConfig = null;
let GlobalTetrisGames = [];
let tournamentActive = false;
let tetrisPageLoaded = false;
