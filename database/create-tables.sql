CREATE TABLE `TicketDB`.`User`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `FirstName` VARCHAR(50) NOT NULL DEFAULT '',
    `LastName` VARCHAR(50) NOT NULL DEFAULT '',
    `Email` VARCHAR(50) NOT NULL DEFAULT '',
    `Password` VARCHAR(255) NOT NULL DEFAULT '',
    `Active` BOOLEAN NOT NULL DEFAULT FALSE,
    `IsAdmin` BOOLEAN NOT NULL DEFAULT FALSE,
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`),
    UNIQUE KEY (`Email`)
)ENGINE = innoDB;


CREATE TABLE `TicketDB`.`Movie`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `Title` VARCHAR(50) NOT NULL DEFAULT '',
    `Genre` VARCHAR(50) NOT NULL DEFAULT '',
    `ReleaseDate` VARCHAR(50) NOT NULL DEFAULT '',
    `ImageUrl` VARCHAR(100) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`)
)ENGINE = innoDB;

CREATE TABLE `TicketDB`.`ShowTimes`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `MovieID` INT NOT NULL DEFAULT 0,
    `Seats` INT NOT NULL DEFAULT 24,
    `Datetime` TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:01',
    `Location` VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`),
    Foreign Key (`MovieID`) REFERENCES Movie(`ID`) ON DELETE CASCADE
)ENGINE = innoDB;

CREATE TABLE `TicketDB`.`Ticket`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `ShowTimeID` INT NOT NULL DEFAULT 0,
    `MovieName` VARCHAR(50) NOT NULL DEFAULT '',
    `ShowTime` TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:01',
    `LocationAddress` VARCHAR(50) NOT NULL DEFAULT '',
    `SeatNumber` VARCHAR(50) NOT NULL DEFAULT '',
    `CustomerID` INT NOT NULL DEFAULT '0',
    `Age` INT NOT NULL DEFAULT '0', 
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`),
    UNIQUE KEY `showtime_seatUq` (`ShowTimeID`, `SeatNumber`),
    FOREIGN KEY (`CustomerID`) REFERENCES User(`ID`) ON DELETE CASCADE,
    Foreign Key (`ShowTimeID`) REFERENCES ShowTimes(`ID`) ON DELETE CASCADE
)ENGINE = innoDB;