async function fetchMovies() {
    let data;

    if (USE_MOCK) {
        data = await api(MOVIES_PATH);
    } else {
        const response = await fetch(MOVIES_PATH, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + state.user.id,
                'X-User-Id': state.user.id,
            },
        });

        if (response.status === 401) {
            signOut();
            throw new Error('Your session expired. Sign in again.');
        }

        // Remove the route comment emitted before the JSON by the movies endpoint.
        const text = (await response.text()).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error('The server returned an invalid movie response.');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Unable to load movies.');
        }
    }

    const movies = Array.isArray(data) ? data : data?.movies;
    if (!Array.isArray(movies)) {
        throw new Error('The server did not return a movie list.');
    }

    return movies;
}

async function loadMovies() {

    const movieList =
        document.getElementById("movie-list");


    movieList.innerHTML =
        "<p>Loading movies...</p>";


    try {

        const movies =
            await fetchMovies();


        movieList.innerHTML = "";


        movies.forEach(function(movie) {

            const movieCard =
                document.createElement("div");


            movieCard.innerHTML = `
                <img
                    src="${movie.ImageUrl}"
                    alt="${movie.Title}"
                    width="200"
                >

                <h3>${movie.Title}</h3>

                <p>${movie.Genre}</p>

                <p>${movie.ReleaseDate}</p>

                <a href="movie.html?id=${movie.ID}&v=20260925-3">
                    View Showtimes
                </a>
            `;


            movieList.appendChild(movieCard);

        });

    }

    catch (error) {

        movieList.innerHTML =
            `<p>${error.message}</p>`;

    }

}


if (requireAuth()) {

    loadMovies();

}
