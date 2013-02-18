ALTER TABLE `neo_api_block` DROP PRIMARY KEY;
ALTER TABLE `neo_api_block` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_segment` DROP PRIMARY KEY;
ALTER TABLE `neo_api_segment` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_event` DROP PRIMARY KEY;
ALTER TABLE `neo_api_event` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_eventarray` DROP PRIMARY KEY;
ALTER TABLE `neo_api_eventarray` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_epoch` DROP PRIMARY KEY;
ALTER TABLE `neo_api_epoch` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_epocharray` DROP PRIMARY KEY;
ALTER TABLE `neo_api_epocharray` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_unit` DROP PRIMARY KEY;
ALTER TABLE `neo_api_unit` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_spiketrain` DROP PRIMARY KEY;
ALTER TABLE `neo_api_spiketrain` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_analogsignal` DROP PRIMARY KEY;
ALTER TABLE `neo_api_analogsignal` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_analogsignalarray` DROP PRIMARY KEY;
ALTER TABLE `neo_api_analogsignalarray` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_irsaanalogsignal` DROP PRIMARY KEY;
ALTER TABLE `neo_api_irsaanalogsignal` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_spike` DROP PRIMARY KEY;
ALTER TABLE `neo_api_spike` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_recordingchannelgroup` DROP PRIMARY KEY;
ALTER TABLE `neo_api_recordingchannelgroup` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_recordingchannel` DROP PRIMARY KEY;
ALTER TABLE `neo_api_recordingchannel` ADD PRIMARY KEY (`guid`);

ALTER TABLE `neo_api_waveform` DROP PRIMARY KEY;
ALTER TABLE `neo_api_waveform` ADD PRIMARY KEY (`guid`);
