CREATE TABLE `TicketDB`.`User`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `FirstName` VARCHAR(50) NOT NULL DEFAULT '',
    `LastName` VARCHAR(50) NOT NULL DEFAULT '',
    `Email` VARCHAR(50) NOT NULL DEFAULT '',
    `Password` VARCHAR(50) NOT NULL DEFAULT '',
    `Active` BOOLEAN NOT NULL DEFAULT FALSE,
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`)
)ENGINE = innoDB;

CREATE TABLE `TicketDB`.`Admin`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `AdminID` INT NOT NULL DEFAULT '0',
    PRIMARY KEY (`ID`),
    Foreign Key (`AdminID`) REFERENCES User(`ID`)
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

CREATE TABLE `TicketDB`.`Ticket`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `MovieName` VARCHAR(50) NOT NULL DEFAULT '',
    `ShowTime` VARCHAR(50) NOT NULL DEFAULT '',
    `LocationAddress` VARCHAR(50) NOT NULL DEFAULT '',
    `CustomerID` INT NOT NULL DEFAULT '0',
    `Age` INT NOT NULL DEFAULT '0', --0 for adult, 1 for child, 2 for senior 
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`),
    FOREIGN KEY (`CustomerID`) REFERENCES User(`ID`)
)ENGINE = innoDB;