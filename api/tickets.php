/* API ROUTES

GET    /tickets					 : returns all a users tickets
GET    /tickets/{id}			 : returns a ticket by id
GET    /tickets?showing={string} : searches users tickets by movie name
POST   /tickets				     : buy ticket  
DELETE /tickets/{id}             : delete ticket 

*/

<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

// require that movies has been routed through index so auth
if (!defined('RESOURCE_ID') && !array_key_exists('RESOURCE_ID', $GLOBALS)) {
    respond(403, ["error" => "Direct script access forbidden"]);
    exit;
}

// get http request
$method = $_SERVER['REQUEST_METHOD'];
$ticketId = $GLOBALS['RESOURCE_ID']; // primary key or null

switch($method){

    case 'GET':
	$db = getDB();

	//verify ticket exits
	if($ticketId){
	    $stmt = $db->prepare("SELECT `ID`, `ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `Age`
			    FROM Ticket
				WHERE ID = :id AND CustomerID = :userId
				LIMIT 1");
	    $stmt->execute([
			':id' => $ticketId,
	       	':userId' => $GLOBALS['USER_ID']]);

	    $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

	    if(!$ticket){ //DNE
	        respond(404, ["error" => "Tikcet with ID $ticketId not found"]);
			exit;
	    }

	    //otherise respon
	    respond(200, $ticket);
	}

	//allows users to search through their tickets by name
	$searchTicket = $_GET['showing'] ?? null;
	if($searchTicket){
		
	    $stmt = $db->prepare("SELECT `ID`, `ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `Age`
				FROM Ticket
				WHERE CustomerID = :userId AND MovieName = :showing");

	    $stmt->execute([
			':userId' => $GLOBALS['USER_ID'],
			':showing' => $searchTicket]);
	}
	else { //display all users tickets
	    $stmt = $db->prepare("SELECT `ID`, `ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `Age`
				FROM Ticket
				WHERE CustomerID = :userId");

	    $stmt->execute([':userId' => $GLOBALS['USER_ID']]);
	}

	$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
	respond(200, $tickets);
	exit;

	break;

    case 'POST':
	
	//format api request
	$body = getRequestBody();
	$movieId = clean($body['MovieID'] ?? '');
	$showId = clean($body['ShowTimeID'] ?? '');
	$age = clean($body['Age'] ?? '');
	$seat = clean($body['SeatNumber'] ?? '');
	
	if($movieId == '' || $showId == '' || $age == '' || $seat == ''){
		respond(400, ["error" => "MovieID, ShowTimeID, Age, and SeatNumber are required."]);
		exit;
	}

	$db = getDB();

	//get title from movie table
	$stmt = $db->prepare("SELECT `Title` FROM Movie WHERE `ID` = :id LIMIT 1");
	$stmt->execute([':id' => $movieId]);
	$movie = $stmt->fetch(PDO::FETCH_ASSOC);

	//verify movie exists 
	if(!$movie){
		respond(404, "Movie not found for booking.");
		exit;
	}

	$title = $movie['Title'];

	//get location and show time from ShowTime table
	$stmt = $db->prepare("SELECT `Datetime`, `Location` FROM ShowTimes WHERE `ID` = :id LIMIT 1");
	$stmt->execute([':id' => $showId]);
	$show = $stmt->fetch(PDO::FETCH_ASSOC);

	//verify showing exists 
	if(!$show){
		respond(404, "Showing not found for booking.");
		exit;
	}

	$location = $show['Location'];
	$time = $show['Datetime'];

	$stmt = $db->prepare("INSERT INTO Ticket (`ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `CustomerID`, `Age`)
						VALUES (:showId, :movieName, :showTime, :lo, :seat, :userId, :age ) ");

	//if user tries to book an already booked seat display error
	try{
		$success = $stmt->execute([
			':showId' => $showId,
			':movieName' => $title,
			':showTime' => $time,
			':lo' => $location,
			':seat' => $seat, 
			':userId' => $GLOBALS['USER_ID'],
			':age' => $age
		]);

		respond(201, ["message" => "Ticket successfully booked!"]);
		exit;
	}
	catch(PDOException $e){
		if($e->getCode() == 23000){ //integrity constraint
			respond(409, ["error" => "Seat already taken"]);
			exit;	
		}

		respond(500, ["message" => "Booking failed."]);
	}
	break;

    case 'DELETE':

	$db = getDB();
	
	if(!$ticketId){
		respond(400, ["error" => "Ticket ID required for deletion."]);
		exit;
	}

	$stmt = $db->prepare("DELETE FROM Ticket WHERE `id` = :id AND `CustomerID` = :userId");
	$success = $stmt->execute([':id' => $ticketId, //when deleting a movie all assoc showtimes are auto deleted
							   ':userId' => $GLOBALS['USER_ID']]); // DELETE on cascade
	if($success){
	   respond(200, ["message" => "Movie successfully deleted!"]);
	   exit;
	}
	else {
	   respond(500, ["error" => "Deletion failed."]);
	   exit;
	}
		break;

	default:
		respond(404, ["error" => "Request not found."]);
        exit;
}