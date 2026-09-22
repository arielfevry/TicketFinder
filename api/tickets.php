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
	    $stmt = $db->prepare("SELECT `ID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`
			         FROM Ticket
				 WHERE ID = :id AND CustomerID = :userId
				 LIMIT 1");
	    $stmt->execute([':id' => $ticketId,
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
	    $stmt = $db->prepare("SELECT `ID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`
				 FROM Ticket
				 WHERE CustomerID = :userId AND MovieName = :showing");

	    $stmt->execute([':userId' => $GLOBALS['USER_ID'],
			    ':showing' => $searchTicket]);
	}
	else { //display all users tickets
	    $stmt = $db->prepare("SELECT `ID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`
				 FROM Ticket
				 WHERE CustomerID = :userId");

	    $stmt->execute([':userId' => $GLOBALS['USER_ID']]);
	}

	$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
	respond(200, $tickets);
	exit;

	break;


    case 'POST':
	break;


    case 'DELETE':
	

}




