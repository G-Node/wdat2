package com.gnode.uploadpage.client;

import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.RootPanel;

import gwtupload.client.IUploader;
import gwtupload.client.PreloadedImage;
import gwtupload.client.IUploadStatus.Status;
import gwtupload.client.PreloadedImage.OnLoadPreloadedImageHandler;

/**
 * Entry point classes define <code>onModuleLoad()</code>.
 */
public class UploadPage implements EntryPoint {

	  // Load the image in the document and in the case of success attach it to the viewer
	  private IUploader.OnFinishUploaderHandler onFinishUploaderHandler = new IUploader.OnFinishUploaderHandler() {
	    public void onFinish(IUploader uploader) {
	      if (uploader.getStatus() == Status.SUCCESS) {
	        new PreloadedImage(uploader.fileUrl(), showImage);
	      }
	    }
	  };

	  // A panel where the thumbnails of uploaded images will be shown
	  private FlowPanel panelImages = new FlowPanel();

	  // Attach an image to the pictures viewer
	  private OnLoadPreloadedImageHandler showImage = new OnLoadPreloadedImageHandler() {
	    public void onLoad(PreloadedImage image) {
	      image.setWidth("75px");
	      panelImages.add(image);
	    }
	  };

	  public void onModuleLoad() {
	    // Attach the image viewer to the document
	    RootPanel.get("thumbnails").add(panelImages);
	    
	    // Create a new uploader panel and attach it to the document
	    MultiUploader defaultUploader = new MultiUploader();
	    RootPanel.get("default").add(defaultUploader);
	    // Add a finish handler which will load the image once the upload finishes
	    defaultUploader.addOnFinishUploadHandler(onFinishUploaderHandler);
	    defaultUploader.setMaximumFiles(3);
	    defaultUploader.setFileInputPrefix("default");
	    // You can add customized parameters to servlet call 
	    //defaultUploader.setServletPath(defaultUploader.getServletPath() + "?foo=bar");
	    defaultUploader.setServletPath("http://localhost/datafiles/upload_page/?foo=bar");
	    defaultUploader.avoidRepeatFiles(true);

	  }
}
