CREATE TABLE `TicketDB`.`Customer`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `FirstName` VARCHAR(50) NOT NULL DEFAULT '',
    `LastName` VARCHAR(50) NOT NULL DEFAULT '',
    `Username` VARCHAR(50) NOT NULL DEFAULT '',
    `Password` VARCHAR(50) NOT NULL DEFAULT '',
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`)
)ENGINE = innoDB;

CREATE TABLE `TicketDB`.`Ticket`
(
    `ID` INT NOT NULL AUTO_INCREMENT,
    `MovieName` VARCHAR(50) NOT NULL DEFAULT '',
    `TheaterName` VARCHAR(50) NOT NULL DEFAULT '',
    `ShowTime` VARCHAR(50) NOT NULL DEFAULT '',
    `LocationAddress` VARCHAR(50) NOT NULL DEFAULT '',
    `CustomerID` INT NOT NULL DEFAULT '0',
    `DateCreated` VARCHAR(50) NOT NULL DEFAULT '',
    `DateUpdated` VARCHAR(50) NOT NULL DEFAULT '',
    PRIMARY KEY (`ID`),
    FOREIGN KEY (`CustomerID`) REFERENCES Customer(`ID`)
)ENGINE = innoDB;