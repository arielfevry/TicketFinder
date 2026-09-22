<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

// require that movies has been routed through index so auth
if (!defined('RESOURCE_ID') && !array_key_exists('RESOURCE_ID', $GLOBALS)) {
    respond(403, ["error" => "Direct script access forbidden"]);
    exit;
}

//$db = getDB(); 

// get http request
$method = $_SERVER['REQUEST_METHOD'];
$movieId = $GLOBALS['RESOURCE_ID']; // primary key or null

switch($method){
    case 'GET':

	$db = getDB();

	if($movieId){
	   $stmt = $db->prepare("SELECT `ID`, `Title`, `Genre`, `ReleaseDate`, `ImageUrl`
				FROM Movie 
				WHERE ID = :id LIMIT 1");
	   $stmt -> execute([':id' => $movieId]);
	   $movie = $stmt->fetch(PDO::FETCH_ASSOC); //fetch assoc formats the db tables in php array similar to JSON

	   if(!$movie){ // movie not found
	      respond(404, ["error" => "Movie with ID $movieId not found"]);
	      exit;
	   }

	   respond(200, $movie);
	   exit;
	}

	// search using url query parameters
	$searchTitle = $_GET['title'] ?? null;
	if($searchTitle){
	   $stmt = $db->prepare("SELECT `ID`, `Title`, `Genre`, `ReleaseDate`, `ImageUrl`
				FROM Movie
				WHERE Title LIKE :title");
	   $stmt -> execute([':title' => '%' . $searchTitle . '%']); // partial lookup on movie title
	}
	else { // no parameters display all movies
	   $stmt = $db->query("SELECT `ID`, `Title`, `Genre`, `ReleaseDate`, `ImageUrl` FROM Movie");
	}

	$movies = $stmt->fetchAll(PDO::FETCH_ASSOC);
	respond(200, $movies);
	exit;

	break;

    case 'POST':
	// ensure user is an admin 
	requireAdmin($GLOBALS['USER_ID']); 

	$body = getRequestBody();
	
	// parse body fields 
	$title = clean($body['title'] ?? '');
	$genre = clean($body['genre'] ?? '');
	$release = clean($body['release-date'] ?? '');
	$img = clean($body['img-url'] ?? '');

	// make sure theyre not empty
	if($title == '' || $genre == '' || $release == '' || $img == ''){
	   respond(400, ["error" => "Title, Genre, Release Date, and Img URL are required"]);
	   exit;
	}

	$db = getDB();
	$stmt = $db->prepare("INSERT INTO Movie (`Title`, `Genre`, `ReleaseDate`, `ImgUrl`) VALUES (:title, :genre, :releaseDate, :img)");
	
	// execute insetion 
	$success = $stmt->execute([
		':title'       => $title,
		':genre'       => $genre,
		':releaseDate' => $release,
		':img'         => $img]);
	
	// respond success of failure
	if($success){
	   respond(201, ["message" => "Movie successfully added!"]);
	   exit;
	}
	else {
	   respond(500, ["error" => "Request failed"]);
	   exit;
	}

	break;

    case 'PUT': // update movie
	requireAdmin($GLOBALS['USER_ID']); // ensure admin

	// update based on movieId global 
	if(!$movieId){
	   respond(400, ["error" => "Movie ID required"]);
	   exit;
	}

	$body = getRequestBody();
	$title = clean($body['title'] ?? '');
        $genre = clean($body['genre'] ?? '');
        $release = clean($body['release-date'] ?? '');
        $img = clean($body['img-url'] ?? '');

	//validate 
	if($title == '' || $genre == '' || $release == '' || $img == ''){
           respond(400, ["error" => "Title, Genre, Release Date, and Img URL are required"]);
           exit;
        }

	$db = getDB();
	$stmt = $db->prepare("UPDATE Movie
				SET `Title` = :title,
			            `Genre` = :genre,
				    `ReleaseDate` = :releaseDate,
				    `ImgUrl` = :img
			      WHERE `id` = :id");

	$success = $stmt->execute([
		':title'    => $title,
		':genre'    => $genre,
		':releaseDate' => $release, 
		':img'         => $img,
		':id'          => $movieId]);

	// check for success
	if($success){
	   respond(200, ["message" => "Movie successfully updated!"]);
	   exit;
	}
	else{
	   respond(500, ["error" => "Updated failed."]);
	   exit;
	}
	break;

   case 'DELETE':
	requireAdmin($GLOBALS['USER_ID']);

	// delete by id
	if(!$movieId){
	   respond(400, ["error" => "Movie ID required"]);
	   exit;
	}

	$db = getDB();
	$stmt = $db->prepare("DELETE FROM Movie WHERE `id` = :id");
	$success = $stmt->execute([':id' => $movieId]);

	if($success){
	   respond(200, ["message" => "Movie successfully deleted!"]);
	   exit;
	}
	else {
	   respond(500, ["error" => "Deletion failed."]);
	   exit;
	}

	break;
}
	
