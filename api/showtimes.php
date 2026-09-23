/* API ROUTES

GET    /showtimes/{id}         : returns details for a showtime by id
GET    /showtimes?movie={id}   : returns a showtimes by movie id
GET    /showtimes/id/seat      : returns seats for a single showing
POST/PUT/DELETE                : admin required

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
$showId = $GLOBALS['RESOURCE_ID']; // primary key or null
$sub = $GLOBALS['SUB_RESOURCE'];

switch($method){
    case 'GET':
        $db = getDB();

        //sub resource seats display all seats for show time by id
        if($sub === 'seats' && $showId){ //find seat capcity
            $stmt = $db->prepare("SELECT `Seats` FROM ShowTimes WHERE `ID` = :id LIMIT 1");
            $stmt->execute([':id' => $showId]);
            $showTime = $stmt->fetch(PDO::FETCH_ASSOC);

            if(!$showTime){ //no shwo time found
                respond(404, ["error" => "Showtime with ID $showId not found"]);
                exit;
            }

            $seatCapacity = (int)$showTime['Seats'];

            // make find seat layout in array
            $rows = ceil($seatCapacity / 6); //24 seats in rows of 6
            $seatCount = 0;
            $seatTable =[];

            //iterate over the rows/cols of a 24 seat map
            for($i = 0; $i < $rows; $i++){
                $let = chr(65 + $i); //row letter A, B, C, D
                for($j = 1; $j <= 6; $j++){
                    if($seatCount >= $seatCapacity) break;
                    $seatTable[] = $let . $j; //save row and seatnumber in map A1, A2 ..
                    $seatCount++;
                }
            }

            //get taken seats in list of tickets
            $stmt = $db->prepare("SELECT `SeatNumber` FROM Ticket WHERE `ShowTimeID` = :showId");
            $stmt->execute([':showId' => $showId]);
            $takenSeats = $stmt->fetchAll(PDO::FETCH_COLUMN); //[A1 B4 C2]

            //search tickets to see what seats are booked
            $seatMap= [];
            foreach($seatTable as $seat){ //loop through all possible seats
                $seatMap[] = [
                    'seatNumber' => $seat,
                    'is_availible' => !in_array($seat, $takenSeats)
                ];
            }

            respond(200, ['ShowTimeID' => $showId, 'seats' => $seatMap]);

        }

        if($showId){ //show time id inputted
            $stmt = $db->prepare("SELECT `ID`, `MovieID`, `Seats`, `Datetime`, `Location`
                                FROM ShowTimes
                                WHERE `ID` = :showID LIMIT 1");

            $stmt->execute([':showID' => $showId]);
            $showTime = $stmt->fetch(PDO::FETCH_ASSOC);

            if(!$showTime){ //showtime DNE
                respond(404, ["error" => "Showtime with ID $showId not found"]);
	            exit;
            }

            respond(200, $showTime);
        }

        //query parameters
        $searchShow = $_GET['movie'] ?? null;
        if($searchShow){ //query set
            $stmt = $db->prepare("SELECT `ID`, `MovieID`, `Seats`, `Datetime`, `Location`
                                FROM ShowTimes
                                WHERE `MovieID` = :movie");

            $stmt->execute([':movie' => $searchShow]);
            $showTimes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if(!$showTimes){
                respond(404, ["error" => "Showtime with ID $showId not found"]);
                break;
            }

            respond(200, $showTimes);
        }

        break;

    default:
        respond(404, ["error:" => "Request not found."]);
        exit;
}