<?php

require_once __DIR__ . '/api/config/helpers.php';

setCORSHeaders();
header("Content-Type: application/json; charset=UTF-8");

// 1. get URI request from broswer
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 2. convert requests to simple paths
$path = str_replace('/TicketFinder', '', $request);
$path = trim($path, '/');

// 3. explode path to get resource IDs
$fields = explode('/', $path);

$resource = $fields[0] ?? ''; 
$GLOBALS['RESOURCE_ID'] = null; // default resource id to null
$GLOBALS['SUB_RESOURCE'] = $fields[2] ?? ''; //accomdates admin/users/{id} paths

if(isset($fields[1]) && is_numeric($fields[1])){  //if resource requested by ID ie: movies/12
	$GLOBALS['RESOURCE_ID'] = (int)$fields[1]; // save globally
}

// 4. route resource request to appropriate api files
switch($resource) {
	// public routes
        case 'login':
		require __DIR__ . '/api/auth/login.php';
		break;

	case 'register':
		require __DIR__ . '/api/auth/register.php';
		break;

	// authetication required routs 
	case 'tickets':
		$GLOBALS['USER_ID'] = requireAuth();

		require __DIR__ . '/api/tickets.php';
		break;

	case 'movies':
		$GLOBALS['USER_ID'] = requireAuth();

		require __DIR__ . '/api/movies.php';
		break;

	case 'admins':
		$GLOBALS['USER_ID'] = requireAuth();
		requireAdmin($GLOBALS['USER_ID']);

		$GLOBALS['SUB_RESOURCE'] = $fields[1] ?? '';
		if(isset($fields[2]) && is_numeric($fields[2])) $GLOBALS['RESOURCE_ID'] = (int)$fields[2];

		require __DIR__ . '/api/admins.php';
		break;

	case 'showtimes':
		$GLOBALS['USER_ID'] = requireAuth();

		require __DIR__ . '/api/showtimes.php';
		break;

	default: //invalid path 
		respond(404, ["error" => "Endpoint not found"]);
		break;
}