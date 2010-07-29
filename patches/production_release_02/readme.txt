Release 2 - what to do and how to update:
=========================================

1. MAKE SQL DUMP!!!

2. Match SETTINGS.PY, add new values

3. SVN update 

4. syncdb + create additional tables for exprts / datasets / files 
(using "manage.py sql <module>" or supplementary a, b)

5. UNCOMMENT fields in models!!
- experiments
- datasets
- datafiles
and reload web server.

6. Apply patches (change paths before):
python
>>> from patches.production_release_02.patches import migration
>>> a = migration()
>>> a.update_experiments()
>>> a.update_datasets()
>>> a.update_datafiles()

7. Delete unnecessary fields (supplementary, c)

8. Comment (or delete) fields in models

9. Delete unused tables (supplementary, d)

10. odML vocabularies load

11. Datafile.title = remove 'NOT NULL' from the DB

12. TEST THE WHOLE SOLUTION





""" SUPPLEMENTARY """

a) to create for Datasets
CREATE TABLE `datasets_rdataset_in_projects` (
    `id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
    `rdataset_id` integer NOT NULL,
    `project_id` integer NOT NULL,
    UNIQUE (`rdataset_id`, `project_id`)
);
ALTER TABLE `datasets_rdataset_in_projects` ADD CONSTRAINT `rdataset_id_refs_safetylevel_ptr_id_2ce598ce412b3caa` FOREIGN KEY (`rdataset_id`) REFERENCES `datasets_rdataset` (`safetylevel_ptr_id`);
ALTER TABLE `datasets_rdataset_in_projects` ADD CONSTRAINT `project_id_refs_id_2ac9764ed24575f7` FOREIGN KEY (`project_id`) REFERENCES `projects_project` (`id`);
COMMIT;

b) to create for Datafiles
CREATE TABLE `datafiles_datafile_in_projects` (
    `id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
    `datafile_id` integer NOT NULL,
    `project_id` integer NOT NULL,
    UNIQUE (`datafile_id`, `project_id`)
);
ALTER TABLE `datafiles_datafile_in_projects` ADD CONSTRAINT `datafile_id_refs_safetylevel_ptr_id_4da9a8630812c58` FOREIGN KEY (`datafile_id`) REFERENCES `datafiles_datafile` (`safetylevel_ptr_id`);
ALTER TABLE `datafiles_datafile_in_projects` ADD CONSTRAINT `project_id_refs_id_45ee5385038359b4` FOREIGN KEY (`project_id`) REFERENCES `projects_project` (`id`);
COMMIT;

c) some fields to delete

ALTER TABLE `experiments_experiment` DROP `exp_type`
ALTER TABLE `experiments_experiment` DROP `subject` 
ALTER TABLE `datasets_rdataset` DROP `dataset_qty` 
ALTER TABLE `datafiles_datafile` DROP `recording_date` 

d) drop unused tables
DROP TABLE `blog_post`, `bookmarks_bookmark`, `bookmarks_bookmarkinstance`, `datafiles_datafile_in_datasets`, `datafiles_datafile_in_expts`, `datasets_rdataset_in_experiments`, `flag_flaggedcontent`, `flag_flaginstance`, `microblogging_following`, `microblogging_tweet`, `microblogging_tweetinstance`, `photologue_gallery`, `photologue_galleryupload`, `photologue_gallery_photos`, `photologue_photo`, `photologue_photoeffect`, `photologue_photosize`, `photologue_watermark`, `photos_image`, `photos_image_photoset`, `photos_photoset`, `photos_pool`, `robots_rule`, `robots_rule_allowed`, `robots_rule_disallowed`, `robots_rule_sites`, `robots_url`, `swaps_offer`, `swaps_swap`, `tasks_nudge`, `tasks_task`, `tasks_taskhistory`, `tribes_tribe`, `tribes_tribe_members`, `votes`;



