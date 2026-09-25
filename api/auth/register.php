<?php

//connect to the database:
require_once __DIR__ . '/../config/db.php'; 

//Only execute if POST:
if($_SERVER["REQUEST_METHOD"] != "POST")
{
	respond(405, ['error'  => 'Request must be POST']);
}

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
$db = getDB();
$stmt = $db->prepare('SELECT ID FROM `User` WHERE Email = ?');

$stmt->execute([$email]);

if($stmt->fetch())
{
	respond(409, ['error'=> 'An account with this email already exists']);
}



$stmt = $db->prepare('INSERT INTO `User` (FirstName, LastName, Email, Password, Active, DateCreated, DateUpdated)
		VALUES (?, ?, ?, ?, ?, ?, ?)');


$hashPassword = password_hash($password, PASSWORD_DEFAULT);
$date = date('Y-m-d H:i:s');

$stmt->execute([ $firstName, $lastName, $email, $hashPassword, true, $date, $date]);

respond(201, ['success' => true, 'message' => 'User registered successfully']);







