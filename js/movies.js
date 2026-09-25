const movies = [
    {
        ID: 1,
        Title: "The Fortnite Movie",
        Genre: "Action",
        ReleaseDate: "2026-09-01",
        ImageUrl: "cat_img.jpg"
    },
    {
        ID: 2,
        Title: "Movie Two",
        Genre: "Comedy",
        ReleaseDate: "2026-09-10",
        ImageUrl: "cat_img.jpg"
    }
];


const movieList = document.getElementById("movie-list");


movies.forEach(function(movie) {

    const movieCard = document.createElement("div");

    movieCard.innerHTML = `
        <img
            src="${movie.ImageUrl}"
            alt="${movie.Title}"
            width="200"
        >

        <h3>${movie.Title}</h3>

        <p>${movie.Genre}</p>

        <p>${movie.ReleaseDate}</p>

        <a href="movie.html?id=${movie.ID}">
            View Showtimes
        </a>
    `;

    movieList.appendChild(movieCard);

});