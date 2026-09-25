<?php

require_once __DIR__ . '/../config/db.php';

//make sure https request is POST
if($_SERVER['REQUEST_METHOD'] !== 'POST')
{
	respond(405, ['error'=> 'Request must be POST']);
}

$body = getRequestBody();

$email = clean($body['email'] ?? '');
$password = $body['password'] ?? '';	 //don't clean password!

//make sure neither is empty
if($email == '' || $password == '')
{
	respond(400, ['error' => 'Email and password are required']);
}

$db = getDB();
$stmt = $db->prepare('SELECT ID, FirstName, LastName, Email, Password, Active, IsAdmin
	FROM `User`
	WHERE Email = ?');


$stmt -> execute([$email]);

//search for matching email from db
$user = $stmt->fetch();

//check if the password of user with that email matches the input
//if no match or user doesnt exist, return error

if(!$user || !password_verify($password, $user['Password']))
{
	respond(401, ['error' => 'Invalid email or password']);
}

unset($user['Password']);



//if there is a match, return info
//code.js done by frontend will use this to create a cookie:
respond(200, [
	'id' => (int)$user['ID'],
	'firstName' => $user['FirstName'], 
	'lastName' => $user['LastName'], 
	'email' => $user['Email'],
	'active' => (bool)$user['Active'], 
	'isAdmin' => (bool)$user['IsAdmin']]);












