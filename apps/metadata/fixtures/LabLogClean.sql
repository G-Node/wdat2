-- use this script to create a new database 
-- (i) the mysql-root  must create a new database
-- (ii) execute this script: mysql newbase < LabLogClean.sql -u root -p
-- created 23.01.2009 release 0.5.130.1
-- ---------------------------------------- --
-- at first the tables without foreign keys --
-- ---------------------------------------- --
--
-- Table structure for table `departments`
--
CREATE TABLE `departments` (
  `ID` int(11) NOT NULL auto_increment,
  `organisation` varchar(100) default NULL,
  `department` varchar(100) default NULL,
  `address` varchar(100) default NULL,
  `postalCode` varchar(20) default NULL,
  `city` varchar(100) default NULL,
  `country` varchar(100) default NULL,
  PRIMARY KEY  (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `databasequeries`
--
CREATE TABLE `databasequeries` (
  `ID` int(11) NOT NULL auto_increment,
  `query` mediumtext,
  `description` mediumtext,
  `authorID` int(11) default NULL,
  PRIMARY KEY  (`ID`),
  KEY `authorID` (`authorID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `datasetproperties`
--
CREATE TABLE `datasetproperties` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(100) default NULL,
  `value` varchar(100) default NULL,
  `datasetID` int(11) default NULL,
  PRIMARY KEY  (`ID`),
  KEY `datasetID` (`datasetID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `diary`
--
CREATE TABLE `diary` (
  `id` int(11) NOT NULL auto_increment,
  `author` int(11) NOT NULL,
  `project` int(11) NOT NULL,
  `date` date default NULL,
  `text` mediumtext,
  PRIMARY KEY  (`id`),
  KEY `author` (`author`),
  KEY `project` (`project`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `funds` (will be replaced soon by grants)
--
CREATE TABLE `funds` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(100) default NULL,
  `code` varchar(100) default NULL,
  PRIMARY KEY  (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `hardware`
--
CREATE TABLE `hardware` (
  `hardwareID` int(11) NOT NULL auto_increment,
  `name` varchar(200) default NULL,
  `category` enum('Camera','Data Acquisition','Electrophysiology','Imaging','Light Sources','Microscope','Power Supply','Stimulus Device','Supplies','other') default 'other',
  `purpose` varchar(200) default NULL,
  `builtBy` varchar(200) default NULL,
  `owner` varchar(200) default NULL,
  `inventoryNo` varchar(100) default NULL,
  `description` mediumtext,
  `purchaseDate` date,
  `price` float(10,2),
  `pricePlanned` float(10,2),
  `currency` varchar(10),
  `fundingID` int(11),
  `status` enum('wishlist','applied for','ordered','existend','broken') DEFAULT 'existend',
  PRIMARY KEY  (`hardwareID`),
  KEY `fundingID` (`fundingID`),
  CONSTRAINT `hardware_ibfk_1` FOREIGN KEY (`fundingID`) REFERENCES `funds` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
 
--
-- Table structure for table `setups`
--
CREATE TABLE `setups` (
  `setupID` int(11) NOT NULL auto_increment,
  `name` varchar(200) default NULL,
  `description` mediumtext,
  PRIMARY KEY  (`setupID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `recsettings`
--
CREATE TABLE `recsettings` (
  `id` int(11) NOT NULL auto_increment,
  `settings` mediumtext,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `sessions`
--
CREATE TABLE `sessions` (
  `sessionID` int(11) NOT NULL auto_increment,
  `comment` mediumtext,
  PRIMARY KEY  (`sessionID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `subjects`
--
CREATE TABLE `subjects` (
  `subjectID` int(11) NOT NULL auto_increment,
  `species` varchar(100) default NULL,
  `name` varchar(200) NOT NULL,
  `gender` varchar(20) default NULL,
  `birthday` date default NULL,
  `comments` mediumtext,
  PRIMARY KEY  (`subjectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `cells`
--
CREATE TABLE `cells` (
  `cellID` int(11) NOT NULL auto_increment,
  `name` varchar(200) NOT NULL,
  `type` varchar(100) default NULL,
  `identified` varchar(200) default NULL,
  `comments` mediumtext,
  PRIMARY KEY  (`cellID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `attachments`
--
CREATE TABLE `attachments` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(100) default NULL,
  `type` varchar(20) default NULL,
  `file` mediumblob,
  `fileSize` mediumtext,
  PRIMARY KEY  (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ----------------------------------
-- now those referencing other tables
-- ----------------------------------
--
-- Table structure for table `persons`
--
CREATE TABLE `persons` (
  `personID` int(11) NOT NULL auto_increment,
  `firstName` varchar(50) default NULL,
  `lastName` varchar(50) NOT NULL,
  `title` varchar(50) default NULL,
  `position` enum('Head of Department','subgroup PI','project RI','external collaborator','assistant','student','other') default NULL,
  `room` varchar(20) default NULL,
  `departmentID` int default NULL,
  `phoneOffice` varchar(20) default ' ',
  `phonePrivate` varchar(20) default ' ',
  `phoneMobile` varchar(20) default NULL,
  `email` varchar(50) default NULL,
  `birthday` date NOT NULL default '2000-01-01',
  `joinedDpt` date NOT NULL default '1995-10-01',
  `leftDpt` date NOT NULL default '2099-01-01',
  `userName` varchar(20),
  PRIMARY KEY  (`personID`),
  KEY `departmentID` (`departmentID`),
  CONSTRAINT `persons_ibfk_1` FOREIGN KEY (`departmentID`) REFERENCES `departments` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `subgroups`
--
CREATE TABLE `subgroups` (
  `subgroupID` int(11) NOT NULL auto_increment,
  `subgroupName` varchar(100) default NULL,
  `subgroupPI` int(11) NOT NULL,
  `subgroupTopic` mediumtext,
  `subgroupStart` date default NULL,
  `subgroupEnd` date default NULL,
  PRIMARY KEY  (`subgroupID`),
  KEY `subgroupPI` (`subgroupPI`),
  CONSTRAINT `subgroups_ibfk_1` FOREIGN KEY (`subgroupPI`) REFERENCES `persons` (`personID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `projects`
--
CREATE TABLE `projects` (
  `projectID` int(11) NOT NULL auto_increment,
  `name` varchar(500) default NULL,
  `RI` int(11) NOT NULL,
  `description` mediumtext,
  `funding` varchar(200) default NULL,
  `subgroup` int(11) default NULL,
  `rootFolder` varchar(200) default NULL,
  `backupLocation` varchar(200) default NULL,
  `start` date default '1995-10-01',
  `status` enum('active','done','postponed','abandoned','planned') default 'active',
  PRIMARY KEY  (`projectID`),
  KEY `RI` (`RI`),
  KEY `subgroup`(`subgroup`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`RI`) REFERENCES `persons` (`personID`),
  CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`subgroup`) REFERENCES `subgroups` (`subgroupID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;




--
-- Table structure for table `documents`
--
CREATE TABLE `documents` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(200) NOT NULL default 'none',
  `type` enum('background','comment','concept','discussion','idea','methods','todo','other') default 'other',
  `projectID` int(11) NOT NULL,
  `authorID` int(11) NOT NULL,
  `date` date NOT NULL default '2000-01-01',
  `text` mediumtext,
  `editFlag` int(11) NOT NULL default '0',
  PRIMARY KEY  (`ID`),
  KEY `projectID` (`projectID`),
  KEY `authorID` (`authorID`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`),
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`authorID`) REFERENCES `persons` (`personID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


--
-- Table structure for table `analyses`
--
CREATE TABLE `analyses` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(200) default NULL,
  `text` mediumtext,
  `authorID` int(11) NOT NULL,
  `date` date default '2000-01-01',
  `originalProjectID` int(11) NOT NULL,
  `editFlag` int(11) NOT NULL default '0',
  PRIMARY KEY  (`ID`),
  KEY `authorID` (`authorID`),
  KEY `originalProjectID` (`originalProjectID`),
  CONSTRAINT `analyses_ibfk_1` FOREIGN KEY (`authorID`) REFERENCES `persons` (`personID`),
  CONSTRAINT `analyses_ibfk_2` FOREIGN KEY (`originalProjectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



--
-- Table structure for table `stimuli`
--
CREATE TABLE `stimuli` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(200) default NULL,
  `text` mediumtext,
  `authorID` int(11) NOT NULL,
  `date` date default '2000-01-01',
  `originalProjectID` int(11) NOT NULL,
  `editFlag` int(11) NOT NULL default '0',
  PRIMARY KEY  (`ID`),
  KEY `authorID` (`authorID`),
  KEY `originalProjectID` (`originalProjectID`),
  CONSTRAINT `stimuli_ibfk_1` FOREIGN KEY (`authorID`) REFERENCES `persons` (`personID`),
  CONSTRAINT `stimuli_ibfk_2` FOREIGN KEY (`originalProjectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `experiments`
--
CREATE TABLE `experiments` (
  `ID` int(11) NOT NULL auto_increment,
  `name` varchar(200) default NULL,
  `text` mediumtext,
  `authorID` int(11) NOT NULL,
  `date` date default '2000-01-01',
  `type` enum('behaviour','electrophysiology','imaging','modelling','other') default NULL,
  `subject` varchar(100) default NULL,
  `originalProjectID` int(11) NOT NULL,
  `setupID` int(11) default NULL,
  `stimulusID` int(11) default NULL,
  `editFlag` int(11) default '0',
  PRIMARY KEY  (`ID`),
  KEY `authorID` (`authorID`),
  KEY `originalProjectID` (`originalProjectID`),
  KEY `setupID` (`setupID`),
  KEY `stimulusID` (`stimulusID`),
  CONSTRAINT `experiments_ibfk_1` FOREIGN KEY (`authorID`) REFERENCES `persons` (`personID`),
  CONSTRAINT `experiments_ibfk_2` FOREIGN KEY (`originalProjectID`) REFERENCES `projects` (`projectID`),
  CONSTRAINT `experiments_ibfk_3` FOREIGN KEY (`setupID`) REFERENCES `setups` (`setupID`),
  CONSTRAINT `experiments_ibfk_4` FOREIGN KEY (`stimulusID`) REFERENCES `stimuli` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


--
-- Table structure for table `datasets`
--
CREATE TABLE `datasets` (
  `datasetID` int(11) NOT NULL auto_increment,
  `name` varchar(200) NOT NULL,
  `filename` varchar(200) default NULL,
  `datafolder` varchar(200) default NULL,
  `sessionID` int(11) default NULL,
  `cellID` int(11) default NULL,
  `subjectID` int(11) default NULL,
  `quality` enum('1','2','3','4','5') default '3',
  `comment` mediumtext,
  `recDate` date default NULL,
  `experimentID` int(11) default NULL,
  `experimenterID` int(11) default NULL,
  `recSettingsID` int(11) default NULL,
  PRIMARY KEY  (`datasetID`),
  KEY `cellID` (`cellID`),
  KEY `sessionID` (`sessionID`),
  KEY `subjectID` (`subjectID`),
  KEY `experimentID` (`experimentID`),
  KEY `experimenterID` (`experimenterID`),
  KEY `recSettingsID` (`recSettingsID`),
  CONSTRAINT `datasets_ibfk_1` FOREIGN KEY (`cellID`) REFERENCES `cells` (`cellID`),
  CONSTRAINT `datasets_ibfk_2` FOREIGN KEY (`sessionID`) REFERENCES `sessions` (`sessionID`),
  CONSTRAINT `datasets_ibfk_3` FOREIGN KEY (`subjectID`) REFERENCES `subjects` (`subjectID`),
  CONSTRAINT `datasets_ibfk_4` FOREIGN KEY (`experimentID`) REFERENCES `experiments` (`ID`),
  CONSTRAINT `datasets_ibfk_5` FOREIGN KEY (`experimenterID`) REFERENCES `persons` (`personID`),
  CONSTRAINT `datasets_ibfk_6` FOREIGN KEY (`recSettingsID`) REFERENCES `recsettings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `settings` (replaces recSettings)
--
CREATE TABLE `settings` (
  `name` varchar(200) NOT NULL,
  `value` varchar(200),
  `unit` varchar(100),  
  `datasetID` int(11),
  `hardwareID` int(11),
  `hardwareAlias` varchar(100),
  KEY `hardwareID`(`hardwareID`),
  KEY `datasetID`(`datasetID`),  
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`datasetID`) REFERENCES `datasets`(`datasetID`),
  CONSTRAINT `settings_ibfk_2` FOREIGN KEY (`hardwareID`) REFERENCES `hardware`(`hardwareID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `settingsTemplate`
--
CREATE TABLE `settingsTemplate` ( 
  `id` int(11) NOT NULL AUTO_INCREMENT, 
  `description` varchar(500) NOT NULL,
  `projectID` int(11) NOT NULL,
  `setupID` int(11) NOT NULL,
  `names` mediumtext,
  `values` mediumtext,
  `units` mediumtext,
  `hardwareIDs`mediumtext,
  `alias` mediumtext,
  PRIMARY KEY `id`(`id`),
  KEY `projectID`(`projectID`),
  KEY `setupID`(`setupID`),
  CONSTRAINT `settingsTemplate_ibfk_1` FOREIGN KEY (`projectID`) REFERENCES `projects`(`projectID`),
  CONSTRAINT `settingsTemplate_ibfk_2` FOREIGN KEY (`setupID`) REFERENCES `setups`(`setupID`)) ENGINE=InnoDB  DEFAULT CHARSET=latin1;

--
-- Table structure for table `propertiesTemplate`
--
CREATE TABLE `propertiesTemplate` ( 
  `id` int(11) NOT NULL AUTO_INCREMENT, 
  `description` varchar(500) NOT NULL,
  `projectID` int(11) NOT NULL,
  `names` mediumtext,
  `values` mediumtext,
  `units` mediumtext,
  PRIMARY KEY `id`(`id`),
  KEY `projectID`(`projectID`),
  CONSTRAINT `propertiesTemplate_ibfk_1` FOREIGN KEY (`projectID`) REFERENCES `projects`(`projectID`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1;


-- --------------------------------- --
-- the register tables 			 --
-- --------------------------------- --
--
-- Table structure for table `analysisregister`
--
CREATE TABLE `analysisregister` (
  `analysisID` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  KEY `analysisID` (`analysisID`),
  KEY `projectID` (`projectID`),
  CONSTRAINT `analysisregister_ibfk_1` FOREIGN KEY (`analysisID`) REFERENCES `analyses` (`ID`),
  CONSTRAINT `analysisregister_ibfk_2` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


--
-- Table structure for table `analysisattachments`
--
CREATE TABLE `analysisattachments` (
  `attachmentID` int(11) NOT NULL,
  `analysisID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `analysisID` (`analysisID`),
  CONSTRAINT `analysisattachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments` (`ID`),
  CONSTRAINT `analysisattachments_ibfk_2` FOREIGN KEY (`analysisID`) REFERENCES `analyses` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `analysisdatabase`
--
CREATE TABLE `analysisdatabase` (
  `analysisID` int(11) NOT NULL,
  `experimentID` int(11) NOT NULL,
  KEY `analysisID` (`analysisID`),
  KEY `experimentID` (`experimentID`),
  CONSTRAINT `analysisdatabase_ibfk_1` FOREIGN KEY (`analysisID`) REFERENCES `analyses` (`ID`),
  CONSTRAINT `analysisdatabase_ibfk_2` FOREIGN KEY (`experimentID`) REFERENCES `experiments` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `cellregister`
--
CREATE TABLE `cellregister` (
  `cellID` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  KEY `cellID` (`cellID`),
  KEY `projectID` (`projectID`),
  CONSTRAINT `cellregister_ibfk_1` FOREIGN KEY (`cellID`) REFERENCES `cells` (`cellID`),
  CONSTRAINT `cellregister_ibfk_2` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


--
-- Table structure for table `documentattachments`
--
CREATE TABLE `documentattachments` (
  `attachmentID` int(11) NOT NULL,
  `documentID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `documentID` (`documentID`),
  CONSTRAINT `documentattachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments` (`ID`),
  CONSTRAINT `documentattachments_ibfk_2` FOREIGN KEY (`documentID`) REFERENCES `documents` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


--
-- Table structure for table `experimentattachments`
--
CREATE TABLE `experimentattachments` (
  `attachmentID` int(11) NOT NULL,
  `experimentID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `experimentID` (`experimentID`),
  CONSTRAINT `experimentattachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments` (`ID`),
  CONSTRAINT `experimentattachments_ibfk_2` FOREIGN KEY (`experimentID`) REFERENCES `experiments` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `experimentregister`
--
CREATE TABLE `experimentregister` (
  `experimentID` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  KEY `experimentID` (`experimentID`),
  KEY `projectID` (`projectID`),
  CONSTRAINT `experimentregister_ibfk_1` FOREIGN KEY (`experimentID`) REFERENCES `experiments` (`ID`),
  CONSTRAINT `experimentregister_ibfk_2` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `hardwareregister`
--
CREATE TABLE `hardwareregister` (
  `setupID` int(11) NOT NULL,
  `hardwareID` int(11) NOT NULL,
  KEY `setupID` (`setupID`),
  KEY `hardwareID` (`hardwareID`),
  CONSTRAINT `hardwareRegister_ibfk_1` FOREIGN KEY (`setupID`) REFERENCES `setups` (`setupID`),
  CONSTRAINT `hardwareRegister_ibfk_2` FOREIGN KEY (`hardwareID`) REFERENCES `hardware` (`hardwareID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `hardwareAttachments`
--
CREATE TABLE `hardwareAttachments` (
  `attachmentID` int(11) NOT NULL,
  `hardwareID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `hardwareID` (`hardwareID`),
  CONSTRAINT `hardwareAttachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments`(`ID`),
  CONSTRAINT `hardwareAttachments_ibfk_2` FOREIGN KEY (`hardwareID`) REFERENCES `hardware`(`hardwareID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `setupAttachments`
--
CREATE TABLE `setupAttachments` (
  `attachmentID` int(11) NOT NULL,
  `setupID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `setupID` (`setupID`),
  CONSTRAINT `setupAttachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments`(`ID`),
  CONSTRAINT `setupAttachments_ibfk_2` FOREIGN KEY (`setupID`) REFERENCES `setups`(`setupID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `involvements`
--
CREATE TABLE `involvements` (
  `ID` int(11) NOT NULL auto_increment,
  `personID` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  PRIMARY KEY  (`ID`),
  KEY `personID` (`personID`),
  KEY `projectID` (`projectID`),
  CONSTRAINT `involvements_ibfk_1` FOREIGN KEY (`personID`) REFERENCES `persons` (`personID`),
  CONSTRAINT `involvements_ibfk_2` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `stimulusregister`
--
CREATE TABLE `stimulusregister` (
  `stimulusID` int(11) NOT NULL,
  `experimentID` int(11) NOT NULL,
  KEY `stimulusID` (`stimulusID`),
  KEY `experimentID` (`experimentID`),
  CONSTRAINT `stimulusregister_ibfk_1` FOREIGN KEY (`stimulusID`) REFERENCES `stimuli` (`ID`),
  CONSTRAINT `stimulusregister_ibfk_2` FOREIGN KEY (`experimentID`) REFERENCES `experiments` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `stimulusattachments`
--
CREATE TABLE `stimulusattachments` (
  `attachmentID` int(11) NOT NULL,
  `stimulusID` int(11) NOT NULL,
  KEY `attachmentID` (`attachmentID`),
  KEY `stimulusID` (`stimulusID`),
  CONSTRAINT `stimulusattachments_ibfk_1` FOREIGN KEY (`attachmentID`) REFERENCES `attachments` (`ID`),
  CONSTRAINT `stimulusattachments_ibfk_2` FOREIGN KEY (`stimulusID`) REFERENCES `stimuli` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `subjectregister`
--
CREATE TABLE `subjectregister` (
  `subjectID` int(11) NOT NULL,
  `projectID` int(11) NOT NULL,
  KEY `subjectID` (`subjectID`),
  KEY `projectID` (`projectID`),
  CONSTRAINT `subjectregister_ibfk_1` FOREIGN KEY (`subjectID`) REFERENCES `subjects` (`subjectID`),
  CONSTRAINT `subjectregister_ibfk_2` FOREIGN KEY (`projectID`) REFERENCES `projects` (`projectID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table `links`
--
CREATE TABLE `links` (
  `connectionID` int(11) NOT NULL auto_increment,
  `referringTable` varchar(100) default NULL,
  `referringField` varchar(100) default NULL,
  `referencedTable` varchar(100) default NULL,
  `referencedField` varchar(100) default NULL,
  `interest` varchar(200) default NULL,
  PRIMARY KEY  (`connectionID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
