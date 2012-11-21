ALTER TABLE `metadata_section` DROP PRIMARY KEY;
ALTER TABLE `metadata_section` ADD PRIMARY KEY (`guid`);

ALTER TABLE `metadata_property` DROP PRIMARY KEY;
ALTER TABLE `metadata_property` ADD PRIMARY KEY (`guid`);

ALTER TABLE `metadata_value` DROP PRIMARY KEY;
ALTER TABLE `metadata_value` ADD PRIMARY KEY (`guid`);
