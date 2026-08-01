const API_KEY = "fa007b99eca4a9e5db0525b1646d0243";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const IMG_URL_LARGE = "https://image.tmdb.org/t/p/w780";

let currentMode = "topMovies";
let currentQuery = "";
let currentGenre = null;
let currentType = "movie";
let allGenres = [];
let favorites = [];

function loadFavorites() {
    const saved = localStorage.getItem("movieFavorites");
    if (saved) {
        favorites = JSON.parse(saved);
    }
}

function saveFavorites() {
    localStorage.setItem("movieFavorites", JSON.stringify(favorites));
}

function isFavorite(id, type) {
    for (let i = 0; i < favorites.length; i++) {
        if (favorites[i].id === id && favorites[i].type === type) {
            return true;
        }
    }
    return false;
}

function toggleFavorite(movie, type) {
    const index = favorites.findIndex(function(item) {
        return item.id === movie.id && item.type === type;
    });
    
    if (index === -1) {
        favorites.push({
            id: movie.id,
            type: type,
            title: movie.title || movie.name,
            poster_path: movie.poster_path,
            release_date: movie.release_date || movie.first_air_date,
            vote_average: movie.vote_average
        });
    } else {
        favorites.splice(index, 1);
    }
    
    saveFavorites();
}

const moviesGrid = document.querySelector("#moviesGrid");
const searchInput = document.querySelector("#searchInput");
const searchBtn = document.querySelector("#searchBtn");
const topMoviesBtn = document.querySelector("#topMoviesBtn");
const topTvBtn = document.querySelector("#topTvBtn");
const genresBtn = document.querySelector("#genresBtn");
const genresFilter = document.querySelector("#genresFilter");
const genresList = document.querySelector("#genresList");
const movieTypeBtn = document.querySelector("#movieTypeBtn");
const tvTypeBtn = document.querySelector("#tvTypeBtn");
const resultsInfo = document.querySelector("#resultsInfo");
const modal = document.querySelector("#modal");
const modalBody = document.querySelector("#modalBody");
const modalClose = document.querySelector("#modalClose");
const favoritesBtn = document.querySelector("#favoritesBtn");

async function fetchData(endpoint) {
    const url = BASE_URL + endpoint + (endpoint.includes("?") ? "&" : "?") + "api_key=" + API_KEY + "&language=uk-UA";
    
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function loadGenres() {
    const movieGenres = await fetchData("/genre/movie/list");
    const tvGenres = await fetchData("/genre/tv/list");
    
    allGenres = {
        movie: movieGenres.genres,
        tv: tvGenres.genres
    };
    
    renderGenres();
}

function renderGenres() {
    const genres = allGenres[currentType];
    let html = "";
    
    for (let i = 0; i < genres.length; i++) {
        const genre = genres[i];
        const activeClass = currentGenre === genre.id ? "active" : "";
        html = html + '<button class="genre-btn ' + activeClass + '" data-id="' + genre.id + '">' + genre.name + '</button>';
    }
    
    genresList.innerHTML = html;
    
    const genreBtns = document.querySelectorAll(".genre-btn");
    for (let i = 0; i < genreBtns.length; i++) {
        genreBtns[i].addEventListener("click", function() {
            const genreId = parseInt(this.getAttribute("data-id"));
            selectGenre(genreId);
        });
    }
}

function selectGenre(genreId) {
    if (currentGenre === genreId) {
        currentGenre = null;
    } else {
        currentGenre = genreId;
    }
    
    renderGenres();
    loadMoviesByGenre();
}

async function loadMoviesByGenre() {
    showLoading();
    
    let allResults = [];
    
    for (let page = 1; page <= 3; page++) {
        let endpoint = "";
        if (currentGenre) {
            endpoint = "/discover/" + currentType + "?with_genres=" + currentGenre + "&page=" + page;
        } else {
            endpoint = "/" + currentType + "/popular?page=" + page;
        }
        
        const data = await fetchData(endpoint);
        allResults = allResults.concat(data.results);
    }
    
    allResults = allResults.slice(0, 50);
    
    const genreName = getGenreName(currentGenre);
    if (currentGenre) {
        resultsInfo.innerText = currentType === "movie" ? "Фільми жанру: " + genreName + " (топ 50)" : "Серіали жанру: " + genreName + " (топ 50)";
    } else {
        resultsInfo.innerText = currentType === "movie" ? "Популярні фільми (топ 50)" : "Популярні серіали (топ 50)";
    }
    
    renderMovies(allResults);
}

function getGenreName(genreId) {
    if (!genreId) return "";
    
    const genres = allGenres[currentType];
    for (let i = 0; i < genres.length; i++) {
        if (genres[i].id === genreId) {
            return genres[i].name;
        }
    }
    return "";
}

async function loadTopMovies() {
    showLoading();
    currentMode = "topMovies";
    currentGenre = null;
    
    let allResults = [];
    
    for (let page = 1; page <= 3; page++) {
        const data = await fetchData("/movie/popular?page=" + page);
        allResults = allResults.concat(data.results);
    }
    
    allResults = allResults.slice(0, 50);
    
    resultsInfo.innerText = "Топ 50 популярних фільмів";
    renderMovies(allResults);
}

async function loadTopTv() {
    showLoading();
    currentMode = "topTv";
    currentGenre = null;
    
    let allResults = [];
    
    for (let page = 1; page <= 3; page++) {
        const data = await fetchData("/tv/popular?page=" + page);
        allResults = allResults.concat(data.results);
    }
    
    allResults = allResults.slice(0, 50);
    
    resultsInfo.innerText = "Топ 50 популярних серіалів";
    renderMovies(allResults);
}

async function searchMovies(query) {
    showLoading();
    currentMode = "search";
    currentQuery = query;
    
    const movieData = await fetchData("/search/movie?query=" + encodeURIComponent(query));
    const tvData = await fetchData("/search/tv?query=" + encodeURIComponent(query));
    
    let results = movieData.results;
    
    for (let i = 0; i < tvData.results.length; i++) {
        tvData.results[i].media_type = "tv";
        results.push(tvData.results[i]);
    }
    
    const totalResults = movieData.total_results + tvData.total_results;
    resultsInfo.innerText = "Результати пошуку для \"" + query + "\": " + totalResults + " знайдено";
    
    if (results.length === 0) {
        showEmpty("На жаль, нічого не знайдено за запитом \"" + query + "\"");
    } else {
        renderMovies(results);
    }
}

function renderMovies(movies) {
    let html = "";
    
    if (movies.length === 0) {
        showEmpty("Нічого не знайдено");
        return;
    }
    
    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const title = movie.title || movie.name;
        const date = movie.release_date || movie.first_air_date || "";
        const year = date ? date.substring(0, 4) : "N/A";
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
        const poster = movie.poster_path ? IMG_URL + movie.poster_path : "https://via.placeholder.com/500x750?text=No+Image";
        const mediaType = movie.media_type || (movie.first_air_date ? "tv" : "movie");
        const isLiked = isFavorite(movie.id, mediaType);
        const likedClass = isLiked ? "liked" : "";
        
        html = html + '<div class="movie-card" data-id="' + movie.id + '" data-type="' + mediaType + '">';
        html = html + '<button class="like-btn ' + likedClass + '" data-id="' + movie.id + '" data-type="' + mediaType + '" data-movie="' + encodeURIComponent(JSON.stringify(movie)) + '">❤</button>';
        html = html + '<img class="movie-poster" src="' + poster + '" alt="' + title + '">';
        html = html + '<div class="movie-info">';
        html = html + '<p class="movie-title">' + title + '</p>';
        html = html + '<div class="movie-meta">';
        html = html + '<span class="movie-year">' + year + '</span>';
        html = html + '<span class="movie-rating"><span class="star">★</span>' + rating + '</span>';
        html = html + '</div>';
        html = html + '</div>';
        html = html + '</div>';
    }
    
    moviesGrid.innerHTML = html;
    
    const cards = document.querySelectorAll(".movie-card");
    for (let i = 0; i < cards.length; i++) {
        cards[i].addEventListener("click", function(event) {
            if (event.target.classList.contains("like-btn")) {
                return;
            }
            const id = this.getAttribute("data-id");
            const type = this.getAttribute("data-type");
            openModal(id, type);
        });
    }
    
    const likeBtns = document.querySelectorAll(".like-btn");
    for (let i = 0; i < likeBtns.length; i++) {
        likeBtns[i].addEventListener("click", function(event) {
            event.stopPropagation();
            const movieData = JSON.parse(decodeURIComponent(this.getAttribute("data-movie")));
            const type = this.getAttribute("data-type");
            toggleFavorite(movieData, type);
            this.classList.toggle("liked");
            
            if (currentMode === "favorites") {
                showFavorites();
            }
        });
    }
}

async function openModal(id, type) {
    const data = await fetchData("/" + type + "/" + id);
    
    const title = data.title || data.name;
    const overview = data.overview || "Опис відсутній";
    const date = data.release_date || data.first_air_date || "";
    const year = date ? date.substring(0, 4) : "N/A";
    const rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
    const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null);
    const poster = data.poster_path ? IMG_URL_LARGE + data.poster_path : "https://via.placeholder.com/780x1170?text=No+Image";
    
    const isLiked = isFavorite(data.id, type);
    const likedClass = isLiked ? "liked" : "";
    const likeText = isLiked ? "❤ У вподобаному" : "♡ Додати до вподобаного";
    
    let genresHtml = "";
    if (data.genres) {
        for (let i = 0; i < data.genres.length; i++) {
            genresHtml = genresHtml + '<span class="modal-genre">' + data.genres[i].name + '</span>';
        }
    }
    
    let html = '<img class="modal-poster" src="' + poster + '" alt="' + title + '">';
    html = html + '<div class="modal-details">';
    html = html + '<h2 class="modal-title">' + title + '</h2>';
    html = html + '<div class="modal-meta">';
    html = html + '<span class="modal-rating">★ ' + rating + '</span>';
    html = html + '<span>' + year + '</span>';
    if (runtime) {
        html = html + '<span>' + runtime + ' хв</span>';
    }
    if (type === "tv" && data.number_of_seasons) {
        html = html + '<span>' + data.number_of_seasons + ' сезон(ів)</span>';
    }
    html = html + '</div>';
    html = html + '<div class="modal-genres">' + genresHtml + '</div>';
    html = html + '<button class="modal-like-btn ' + likedClass + '" id="modalLikeBtn">' + likeText + '</button>';
    html = html + '<p class="modal-overview">' + overview + '</p>';
    html = html + '</div>';
    
    modalBody.innerHTML = html;
    modal.classList.add("visible");
    
    const modalLikeBtn = document.querySelector("#modalLikeBtn");
    modalLikeBtn.addEventListener("click", function() {
        toggleFavorite(data, type);
        const isNowLiked = isFavorite(data.id, type);
        
        if (isNowLiked) {
            this.classList.add("liked");
            this.innerText = "❤ У вподобаному";
        } else {
            this.classList.remove("liked");
            this.innerText = "♡ Додати до вподобаного";
        }
        
        const cardLikeBtn = document.querySelector('.like-btn[data-id="' + data.id + '"][data-type="' + type + '"]');
        if (cardLikeBtn) {
            if (isNowLiked) {
                cardLikeBtn.classList.add("liked");
            } else {
                cardLikeBtn.classList.remove("liked");
            }
        }
        
        if (currentMode === "favorites") {
            showFavorites();
        }
    });
}

function closeModal() {
    modal.classList.remove("visible");
}

function showLoading() {
    moviesGrid.innerHTML = '<div class="loading">Завантаження...</div>';
}

function showEmpty(message) {
    moviesGrid.innerHTML = '<div class="empty-results">' + message + '</div>';
}

function setActiveNav(activeBtn) {
    topMoviesBtn.classList.remove("active");
    topTvBtn.classList.remove("active");
    genresBtn.classList.remove("active");
    favoritesBtn.classList.remove("active");
    activeBtn.classList.add("active");
}

function setActiveType(type) {
    currentType = type;
    
    if (type === "movie") {
        movieTypeBtn.classList.add("active");
        tvTypeBtn.classList.remove("active");
    } else {
        movieTypeBtn.classList.remove("active");
        tvTypeBtn.classList.add("active");
    }
    
    currentGenre = null;
    renderGenres();
    loadMoviesByGenre();
}

searchBtn.addEventListener("click", function() {
    const query = searchInput.value.trim();
    if (query.length > 0) {
        genresFilter.classList.remove("visible");
        setActiveNav(searchBtn);
        topMoviesBtn.classList.remove("active");
        topTvBtn.classList.remove("active");
        genresBtn.classList.remove("active");
        searchMovies(query);
    }
});

searchInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        searchBtn.click();
    }
});

topMoviesBtn.addEventListener("click", function() {
    genresFilter.classList.remove("visible");
    setActiveNav(topMoviesBtn);
    loadTopMovies();
});

topTvBtn.addEventListener("click", function() {
    genresFilter.classList.remove("visible");
    setActiveNav(topTvBtn);
    loadTopTv();
});

genresBtn.addEventListener("click", function() {
    currentMode = "genres";
    setActiveNav(genresBtn);
    genresFilter.classList.toggle("visible");
    if (genresFilter.classList.contains("visible")) {
        loadMoviesByGenre();
    }
});

favoritesBtn.addEventListener("click", function() {
    currentMode = "favorites";
    genresFilter.classList.remove("visible");
    setActiveNav(favoritesBtn);
    showFavorites();
});

function showFavorites() {
    resultsInfo.innerText = "Вподобане: " + favorites.length + " елементів";
    
    if (favorites.length === 0) {
        showEmpty("У вас ще немає вподобаних фільмів або серіалів");
        return;
    }
    
    const moviesForRender = [];
    for (let i = 0; i < favorites.length; i++) {
        const fav = favorites[i];
        moviesForRender.push({
            id: fav.id,
            title: fav.title,
            name: fav.title,
            poster_path: fav.poster_path,
            release_date: fav.release_date,
            first_air_date: fav.type === "tv" ? fav.release_date : null,
            vote_average: fav.vote_average,
            media_type: fav.type
        });
    }
    
    renderMovies(moviesForRender);
}

movieTypeBtn.addEventListener("click", function() {
    setActiveType("movie");
});

tvTypeBtn.addEventListener("click", function() {
    setActiveType("tv");
});

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", function(event) {
    if (event.target === modal) {
        closeModal();
    }
});

async function init() {
    loadFavorites();
    await loadGenres();
    loadTopMovies();
}

init();
