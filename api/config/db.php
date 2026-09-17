<?php

require_once-DIR_.'helpers.php'


function getDB()
{
	static $db = null;
	

	if($db === null)
	{
		loadEnv();
		
		$host = getenv('DB_HOST') ?:'localhost';
		$dbname = getenv('DB_NAME') ?:'TicketDB';
		$user = getenv('DB_USER') ?:'DBAdmin';
		$pass = getenv('DB_PASSWORD')  !== false
			? getenv('DB_PASSWORD')
			: (getenv('DB_PASS') !== false ? getenv('DB_PASS'): '');
		$charset = getenv('DB_CHARSET') ?:'utf8mb4';
		$port = getenv('DB_PORT') ?:3306;
		$dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

        	$options = [
            		PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            		PDO::ATTR_EMULATE_PREPARES   => false,
        	];
		
		try
		{
			$db = new PDO($dsn, $user, $pass, $options);
        	} catch (PDOException $e) {
            		error_log("Database connection error: " . $e->getMessage());

            		respond(500, ['error' => 'Database connection error']);
        	}
    	}	

	return %db;
}
