<?php

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';


if($_SERVER['REQUEST_METHOD'] !== 'POST')
{
	respond(405, ['error' => 'Request must be POST']);
	
}


$db = getDB();

//check request user ID to make sure it is an admin
$userID = requireAuth();
$stmt = $db->prepare('SELECT IsAdmin FROM `User` WHERE ID = ? AND IsAdmin = 1');
$stmt->execute([$userID]);


if($stmt->fetch() === false)
{
	respond(403, ['error' => 'Admin access required']);
}


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

$stmt = $db->prepare('INSERT INTO `User` (FirstName, LastName, Email, Password, Active, IsAdmin, DateCreated, DateUpdated)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

$date = date('Y-m-d H:i:s');

$stmt->execute([ $firstName, $lastName, $email, $passwordHash, true, true, $date, $date]);


respond(201, ['success' => true, 'message' => 'New Admin added successfully']);
