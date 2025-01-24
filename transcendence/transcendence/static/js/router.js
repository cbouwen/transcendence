const route = (event) => {
    event = event || window.event;
    event.preventDefault();
    window.history.pushState({}, "", event.target.href);
    handleLocation();
};

const handleLocation = async () => {
    const path = window.location.pathname;
    const html = await fetch(path).then((data) => data.text());
    document.getElementsByTagName("main")[0].innerHTML = html;
};

window.onpopstate = handleLocation;
window.route = route;

handleLocation();
