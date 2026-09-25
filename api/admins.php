
/* API ROUTES

Admin User Management:

GET             /admins/users               : return list of users
POST	        /admins/users               : create new admin user
GET             /admins/users/{id}          : return user account
PUT	        /admins/users/{id}         : edit users account (change password or active status)

Admin Ticket Management:

GET             /admins/tickets             		: return tickets for showings or users
GET		/admins/tickets?showtimeId={id}	 	: return tickets for  a given showing
GET 		/admins/tickets?userId=12 		: return tickets for a given user
GET             /admins/tickets/{id}      		: get a specific ticket
DELETE          /admins/tickets/{id}        		: cancel a specific ticket

Admin Showtime Management:
GET		/admins/showtimes/{id}	   : return showtime with that Id
POST            /admins/showtimes	   : create new showtime
PUT		/admins/showtimes/{id}      : edit existing showtime
DELETE          /admins/showtimes/{id} 	   : delete showtime

*/


<?php

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$id = $GLOBALS['RESOURCE_ID'] ?? null;
$sub = $GLOBALS['SUB_RESOURCE'];

$db = getDB();

switch($sub)
{
	//Users:
	case 'users':
		switch($method)
		{
			case 'GET':
			//GET -> return list of users:
			//GET with id -> return user account:

			if($id === null)
			{
				//return list of users:
				$stmt = $db->prepare(
				"SELECT ID, FirstName, LastName, Email, Active, IsAdmin, DateCreated, DateUpdated FROM User");

				$stmt->execute();
				$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

				respond(200, ['success' => true, 'users' => $users]);
			}
			else{
				//id included, find this user
				$stmt = $db->prepare("SELECT ID, FirstName, LastName, Email, Active, IsAdmin, DateCreated, DateUpdated FROM User WHERE ID = ?");

				$stmt->execute([$id]);
				$user = $stmt->fetch(PDO::FETCH_ASSOC);

				if(!$user){
					respond(404, ['error' => 'User not found']);
				}

				respond(200, ['success' => true, 'user' => $user]);

			}

				
			break;
			case 'PUT':
			//PUT -> edit user 
			//find the user first:

			if($id === null){
				respond(400, ['error' => 'User ID required']);
			}

			$stmt = $db->prepare("SELECT ID, FirstName, LastName, Email, Active, IsAdmin, DateCreated, DateUpdated FROM User WHERE ID = ?");

                        $stmt->execute([$id]);
                        $user = $stmt->fetch(PDO::FETCH_ASSOC);

			if(!$user){
				respond(404, ['error' => 'User not found']);
                        }

			$date = date('Y-m-d H:i:s');

			//check if we want to change password or Active:			
			$body = getRequestBody();
			if(isset($body['password']) && isset($body['active'])){
				//make sure only pass or active is being updated:
				respond(400, ['error' => 'Update either password or active status, not both']);

			}
			else if(isset($body['password'])){

				if(trim($body['password']) === ''){
					respond(400, ['error' => 'Password cannot be empty']);
				}

				$hashPassword = password_hash($body['password'], PASSWORD_DEFAULT);

				$stmt = $db->prepare("UPDATE User SET Password = ?, DateUpdated = ? WHERE ID = ?");
				$stmt->execute([$hashPassword, $date, $id]);

				respond(200, ['success' => true,'message' => 'Password updated successfully']);
			}
			else if(isset($body['active'])){
				
				//make sure active is bool or corresponds to bool value
				if (!is_bool($body['active'])) {
					respond(400, ['error' => 'Active must be true or false']);
				}

				//convert active to bool. Can cause error if you dont:
				$active = $body['active'] ? 1 : 0;

				$stmt = $db->prepare("UPDATE User SET Active = ?, DateUpdated = ? WHERE ID = ?");
				$stmt ->execute([$active, $date, $id]);

				respond(200, ['success' => true,'message' => 'User active status updated successfully']);
			}
			else{
				respond(400, ['error' => 'Enter password or active status']);
			}

			break;
			case 'POST':
				//POST -> create new admin user
				//get new user info:
				$body = getRequestBody();
				$firstName = clean($body['firstName'] ?? '');
				$lastName = clean($body['lastName'] ?? '');
				$email = clean($body['email'] ?? '');
				$password = $body['password'] ?? '';


				//check if entries are empty
				if($firstName === '' || $lastName === '' || $email === '' || $password === '')
				{
        				respond(400, ['error' => 'All fields are required']);
				}

				//check if email entry seems valid
				if(!filter_var($email, FILTER_VALIDATE_EMAIL))
				{
        				respond(400, ['error' => 'Invalid email address']);
				}


				//make sure email doesn't already exist in database
				$stmt = $db->prepare('SELECT ID FROM `User` WHERE Email = ?');

				$stmt->execute([$email]);

				if($stmt->fetch())
				{
        				respond(409, ['error'=> 'An account with this email already exists']);
				}

				//hash password:
				$passwordHash = password_hash($password, PASSWORD_DEFAULT);

				$stmt = $db->prepare('INSERT INTO `User` (FirstName, LastName, Email, Password, Active, IsAdmin, DateCreated, DateUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

				$date = date('Y-m-d H:i:s');

				$stmt->execute([ $firstName, $lastName, $email, $passwordHash, true, true, $date, $date]);

				respond(201, ['success' => true, 'message' => 'New Admin added successfully']);

			break;

		}

	break;
	case 'tickets':
		switch($method)
		{
			case 'GET':
				//GET -> return tickets for showings
				if($id === null){
					//no id
					//check if search by userID or showtimeID:
					if(isset($_GET['showtimeId'])){

						$showtimeId = $_GET['showtimeId'];
						//check if showtime exists
						$stmt = $db->prepare("SELECT ID FROM ShowTimes WHERE ID = ?");
						$stmt->execute([$showtimeId]);

    						if(!$stmt->fetch()){
        						respond(404, ['error' => 'Showtime could not be found']);
    						}

						//find and return tickets with this showtime
						$stmt = $db->prepare("SELECT `ID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `CustomerID`, `Age`, `DateCreated`, `DateUpdated`
							FROM Ticket
							WHERE ShowTimeID = ?");
	
						$stmt->execute([$showtimeId]);
						$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

						respond(200, ['success' => true, 'tickets' => $tickets]);
					}
					elseif(isset($_GET['userId'])){
						//return all tickets of user
						//check if user exists:
						$userID = $_GET['userId'];

						$stmt = $db->prepare("SELECT ID, FirstName, LastName FROM User WHERE ID = ?");
						$stmt->execute([$userID)];
						if(!$stmt->fetch()){
							respond(404, ['error' => 'User could not be found']);
						}

						$stmt = $db->prepare("SELECT `ID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `CustomerID`, `Age`, `DateCreated`, `DateUpdated`
							FROM Ticket
							WHERE CustomerID = ?");
						$stmt->execute([$userID]);
						$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

                                                respond(200, ['success' => true, 'tickets' => $tickets]);

					}
				}
				else{
					//GET + id -> return a specific ticket
					//Do we need to user UserID as well?
					$stmt = $db->prepare("SELECT `ID`, `ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `Age`
			    			FROM Ticket
						WHERE ID = ?
						LIMIT 1");

					$stmt->execute([$id]);
					$ticket = $stmt->fetch(PDO::FETCH_ASSOC);
					
					if(!$ticket){
						respond(404, ['error' => 'Ticket could not be found']);
					}

					respond(200, $ticket);
				}
			break;
			case 'DELETE':
				//DELETE -> cancel given ticket
				//get the ticket with the id:
				$stmt = $db->prepare("SELECT `ID`, `ShowTimeID`, `MovieName`, `ShowTime`, `LocationAddress`, `SeatNumber`, `Age`
                                        FROM Ticket
                                        WHERE ID = ?
                                	LIMIT 1");

                                $stmt->execute([$id]);
                                $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

                                if(!$ticket){
                                	respond(404, ['error' => 'Ticket could not be found']);
                                }

				//delete ticket:
				//check whether we want to add customer id here:
				$stmt = $db->prepare("DELETE FROM Ticket WHERE `ID` = ?");
				$success = $stmt->execute([$id]); //need to delete on cascade

				if($success){
					respond(200, ['success' => true, 'message' => 'Ticket cancelled successfully']);
				}
			break;

		}

	break;
	case 'showtimes':
		switch($method)
		{
			//CRUD for showtimes:
			//return, edit, delete showtime
			case 'GET':
				//done with showtime ID or movieId
				if($id === null){	//use movieId
					if(isset($_GET['movieId'])){
						$movieID = $_GET['movieId'];

						$stmt = $db->prepare("SELECT `ID` FROM Movie WHERE ID = ?");
						$stmt->execute([$movieID]);
						if(!$stmt->fetch()){
							respond(404, ['error' => 'Movie could not be found']);
						}

						$stmt = $db->prepare("SELECT `ID`, `MovieID`, `Seats`, `Datetime`, `Location`
							FROM ShowTimes
							WHERE MovieID = ?");
						$stmt->execute([$movieID]);
						$showings = $stmt->fetchAll(PDO::FETCH_ASSOC);

						respond(200, ['success' => true, 'showtimes'=> $showings]);

					}
					else{
						respond(400, ['error' => 'movieId needed']);
					}
				}
				else{
					//use showtimeID to find showtime
					
					$stmt = $db->prepare("SELECT `ID`, `MovieID`, `Seats`, `Datetime`, `Location`
							FROM ShowTimes
							WHERE ID = ?");
					$stmt->execute([$id]);
					$showtime = $stmt->fetch(PDO::FETCH_ASSOC);

					if(!$showtime){
						respond(404, ['error' => 'showtime not found']);
					}

					respond(200, ['success' => true, 'showtime' => $showtime]);
				}
			break;
			case 'PUT':
				//edit a showtime, given its id:
				$stmt = $db->prepare("SELECT `ID`
					FROM ShowTimes
					WHERE ID = ?");
				$stmt->execute([$id]);
				$showtime = $stmt->fetch(PDO::FETCH_ASSOC);

				//check if valid showtime
				if(!$showtime){
					respond(404, ['error' => 'Showtime could not be found']);
				}

				//here is where we check what we want to update based on body:
				$body = getRequestBody();
				$updatePairs = [];
				$values = [];

				if(isset($body['seats'])){
					//make sure its a valid entry:
					
					$seats = clean($body['seats']) ?? null;
					if($seats === null || !is_int($seats)){
						respond(400, ['error' => 'invalid entry for seats']);
					}
					$updatePairs[] = "`Seats` = ?";
					$values[] = $seats;
				}
				if(isset($body['datetime'])){ 
					$datetime = $body['datetime'];
					$date =  DateTime::createFromFormat('Y-m-d H:i:s', $datetime);
					
					if(!$date || $date->format('Y-m-d H:i:s') !== $datetime){
    						respond(400, ['error' => 'invalid entry for datetime']);
					}

					$updatePairs[] = "`Datetime` = ?";
					$values[] = $datetime;

				}

				if(isset($body['location'])){
					$location = clean($body['location']);

					if($location === null){
						respond(400, ['error' => 'invalid entry for location']);
					}

					$updatePairs[] = "`Location` = ?";
					$values[] = $location;
				}

				//make sure $updatePairs is not empty:
				if(empty($updatePairs)){
					respond(400, ['error' => 'must update at least one field']);
				}

				$values[] = $id;

				$query = implode(', ', $updatePairs);
				$stmt = $db->prepare("UPDATE ShowTimes SET " . $query . " WHERE ID = ?");
				$stmt->execute($values);

				respond(200, ['success' => true, 'message' => 'fields updated successfully']);

			break;
			case 'POST':
				//create a new showtime
				$body = getRequestBody();
				$seats = clean($body['seats']);
				$datetime = clean($body['datetime']);
				$date = DateTime::createFromFormat('Y-m-d H:i:s', $datetime);

				if(!$date || $date->format('Y-m-d H:i:s') !== $datetime){
    					respond(400, ['error' => 'invalid entry for datetime']);
				}
				$location = clean($body['location']);

				//movieid:
				$movieId = $body['movieId'] ?? null;
				$stmt = $db->prepare("SELECT ID FROM Movies WHERE ID = ?");
				$stmt->execute([$movieId]);
				if(!$stmt->fetch()){
					respond(404, ['error' => 'invalid movie id']);
				}

				$stmt = $db->prepare("INSERT INTO `ShowTimes` (MovieID, Seats, Datetime, Location) VALUES (?, ?, ?, ?));
				$stmt->execute([$movieId, $seats, $datetime, $location]);

				respond(201, ['success' => true, 'message' => 'new showtime created']);

			break;
			case 'DELETE':
				//done with id
				//get showtime:
				 $stmt = $db->prepare("SELECT `ID`, `MovieID`, `Seats`, `Datetime`, `Location`
                                        FROM ShowTimes
                                        WHERE ID = ?");
                                $stmt->execute([$id]);
                                $showtime = $stmt->fetch(PDO::FETCH_ASSOC);

                                //check if valid showtime
                                if(!$showtime){
                                        respond(404, ['error' => 'showtime could not be found']);
                       		}

				$stmt = $db->prepare("DELETE FROM ShowTimes WHERE ID = ?");
				//deleting showtime should delete all tickets with that showtime!
				$stmt->execute([$id]);

				respond(200, ['success' => true, 'message' => 'showtime deleted successfully']);
			break;
		}

	break;
}
