const parameters = new URLSearchParams(window.location.search);
const movieId = Number(parameters.get("id"));


// Temporary movie data
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


// Temporary showtime data
const showtimes = [
    {
        ID: 1,
        MovieID: 1,
        Datetime: "2026-09-25 6:30 PM",
        Location: "Theater 1",
        Seats: 50
    },
    {
        ID: 2,
        MovieID: 1,
        Datetime: "2026-09-25 9:00 PM",
        Location: "Theater 2",
        Seats: 40
    },
    {
        ID: 3,
        MovieID: 2,
        Datetime: "2026-09-26 7:00 PM",
        Location: "Theater 3",
        Seats: 60
    }
];


// Find the movie selected in the URL
const selectedMovie = movies.find(function(movie) {
    return movie.ID === movieId;
});


// Get the movie-details div
const movieDetails = document.getElementById("movie-details");


// Display movie information
if (selectedMovie) {

    movieDetails.innerHTML = `
        <img
            src="${selectedMovie.ImageUrl}"
            alt="${selectedMovie.Title}"
            width="200"
        >

        <h2>${selectedMovie.Title}</h2>

        <p>Genre: ${selectedMovie.Genre}</p>

        <p>Release Date: ${selectedMovie.ReleaseDate}</p>
    `;

}
else {

    movieDetails.innerHTML = `
        <p>Movie not found.</p>
    `;

}


// Get showtimes belonging to this movie
const selectedShowtimes = showtimes.filter(function(showtime) {
    return showtime.MovieID === movieId;
});


// Get showtime-list div
const showtimeList = document.getElementById("showtime-list");


// Display each showtime
selectedShowtimes.forEach(function(showtime) {

    const showtimeCard = document.createElement("div");

    showtimeCard.innerHTML = `
        <p>${showtime.Datetime}</p>

        <p>${showtime.Location}</p>

        <p>Seat Capacity: ${showtime.Seats}</p>

        <button
            class="select-showtime"
            data-showtime-id="${showtime.ID}"
        >
            Select Showtime
        </button>
    `;

    showtimeList.appendChild(showtimeCard);
});


// Get seat-selection div
const seatSelection =
    document.getElementById("seat-selection");


// Get all Select Showtime buttons
const showtimeButtons =
    document.querySelectorAll(".select-showtime");


// Listen for a showtime being selected
showtimeButtons.forEach(function(button) {

    button.addEventListener("click", async function() {

        const showtimeId =
            Number(button.dataset.showtimeId);


        const selectedShowtime =
            showtimes.find(function(showtime) {

                return showtime.ID === showtimeId;

            });


        // Tell the user seats are loading
        seatSelection.innerHTML = `
            <h2>Select a Seat</h2>
            <p>Loading seats...</p>
        `;


        try {

            // REAL BACKEND REQUEST
            const response =
                await fetch(`showtimes/${showtimeId}/seats`);


            // Check if the backend rejected the request
            if (!response.ok) {

                if (response.status === 401) {

                    seatSelection.innerHTML = `
                        <h2>Select a Seat</h2>

                        <p>
                            You must be logged in to view seats.
                        </p>
                    `;

                    return;
                }


                throw new Error(
                    "Unable to load seats."
                );
            }


            // Convert backend JSON into JavaScript
            const data =
                await response.json();


            // The API stores the actual seats inside data.seats
            const seats =
                data.seats;


            seatSelection.innerHTML = `
                <h2>Select a Seat</h2>

                <p>
                    ${selectedShowtime.Datetime}
                </p>

                <p>
                    ${selectedShowtime.Location}
                </p>

                <div id="seat-list"></div>

                <p id="selected-seat"></p>

                <button
                    id="purchase-button"
                    disabled
                >
                    Purchase Ticket
                </button>
            `;


            const seatList =
                document.getElementById("seat-list");


            const selectedSeatText =
                document.getElementById("selected-seat");


            const purchaseButton =
                document.getElementById("purchase-button");


            let selectedSeat = null;


            // Create one button for every seat returned by the API
            seats.forEach(function(seat) {

                const seatButton =
                    document.createElement("button");


                seatButton.textContent =
                    seat.seatNumber;


                // IMPORTANT:
                // The backend currently spells this
                // "is_availible"
                if (seat.is_availible === false) {

                    seatButton.disabled = true;

                    seatButton.textContent +=
                        " (Taken)";

                }


                seatButton.addEventListener(
                    "click",
                    function() {

                        selectedSeat =
                            seat.seatNumber;


                        selectedSeatText.textContent =
                            "Selected Seat: " +
                            selectedSeat;


                        purchaseButton.disabled =
                            false;

                    }
                );


                seatList.appendChild(seatButton);

            });


            purchaseButton.addEventListener(
                "click",
                function() {

                    console.log(
                        "Movie ID:",
                        movieId
                    );

                    console.log(
                        "Showtime ID:",
                        showtimeId
                    );

                    console.log(
                        "Seat:",
                        selectedSeat
                    );


                    alert(
                        "Selected:\n" +
                        selectedMovie.Title +
                        "\n" +
                        selectedShowtime.Datetime +
                        "\nSeat: " +
                        selectedSeat
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "Seat API error:",
                error
            );


            seatSelection.innerHTML = `
                <h2>Select a Seat</h2>

                <p>
                    Seats could not be loaded.
                </p>
            `;

        }

    });

});