<<<<<<< HEAD
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
				if (!is_bool($body['active'])) {
					respond(400, ['error' => 'Active must be true or false']);
				}

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
			break;
			case 'DELETE':
				//DELETE -> cancel a ticket
			break;

		}

	break;
	case 'showtimes':
		switch($method)
		{
			//CRUD for showtimes:
			//return, edit, delete showtime


		}

	break;
}

=======
>>>>>>> parent of c9b0428 (Admin user management endpoints)
