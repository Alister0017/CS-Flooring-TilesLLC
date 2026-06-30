// photoService.js

const PhotoService = {

  /* ==========================================================
     GET PHOTOS
  ========================================================== */

  async getPhotos(){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select(`
        *,
        jobs (
          job_number,
          status,
          customers (
            customer_name
          )
        )
      `)
      .order("created_at",{ascending:false});

    return{data:data||[],error};
  },

  async getPhoto(photoId){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select(`
        *,
        jobs (
          job_number,
          customers (
            customer_name
          )
        )
      `)
      .eq("photo_id",photoId)
      .single();

    return{data,error};
  },

  async getPhotosByJob(jobNumber){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*")
      .eq("job_number",jobNumber)
      .order("sort_order",{ascending:true});

    return{data:data||[],error};
  },

  async getGalleryPhotos(){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*")
      .eq("show_in_gallery",true)
      .order("created_at",{ascending:false});

    return{data:data||[],error};
  },

  async getBeforePhotos(jobNumber){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*")
      .eq("job_number",jobNumber)
      .eq("category",PHOTO.CATEGORIES[0]);

    return{data:data||[],error};
  },

  async getProgressPhotos(jobNumber){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*")
      .eq("job_number",jobNumber)
      .eq("category",PHOTO.CATEGORIES[1]);

    return{data:data||[],error};
  },

  async getAfterPhotos(jobNumber){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*")
      .eq("job_number",jobNumber)
      .eq("category",PHOTO.CATEGORIES[2]);

    return{data:data||[],error};
  },

  /* ==========================================================
     IMAGE STORAGE
  ========================================================== */

  async uploadPhotoImage(file){
    if(!file){
      return{data:null,error:new Error("No file provided.")};
    }

    const extension=file.name.split(".").pop();
    const filePath=`job-photos/${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;

    const{error:uploadError}=await db.storage
      .from("gallery-images")
      .upload(filePath,file);

    if(uploadError){
      return{data:null,error:uploadError};
    }

    const{data}=db.storage
      .from("gallery-images")
      .getPublicUrl(filePath);

    return{
      data:{
        photo_url:data.publicUrl,
        storage_path:filePath
      },
      error:null
    };
  },

  async deletePhotoImage(filePath){
    if(!filePath){
      return{error:null};
    }

    const{error}=await db.storage
      .from("gallery-images")
      .remove([filePath]);

    return{error};
  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createPhoto(photo){
    const payload={
      job_number:photo.job_number,
      category:photo.category||PHOTO.CATEGORIES[5],
      photo_url:photo.photo_url,
      storage_path:photo.storage_path||null,
      caption:photo.caption||null,
      show_in_gallery:photo.show_in_gallery||false,
      is_cover_photo:photo.is_cover_photo||false,
      sort_order:photo.sort_order||0,
      notes:photo.notes||null
    };

    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .insert([payload])
      .select()
      .single();

    return{data,error};
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updatePhoto(photoId,updates){
    const{data,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .update({
        ...updates,
        updated_at:new Date().toISOString()
      })
      .eq("photo_id",photoId)
      .select()
      .single();

    return{data,error};
  },

  async setCoverPhoto(photoId,jobNumber){
    await db
      .from(TABLES.JOB_PHOTOS)
      .update({is_cover_photo:false})
      .eq("job_number",jobNumber);

    return await this.updatePhoto(photoId,{is_cover_photo:true});
  },

  async toggleGalleryPhoto(photoId,show){
    return await this.updatePhoto(photoId,{show_in_gallery:show});
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deletePhoto(photoId){
    const{data:photo}=await this.getPhoto(photoId);

    if(photo?.storage_path){
      await this.deletePhotoImage(photo.storage_path);
    }

    const{error}=await db
      .from(TABLES.JOB_PHOTOS)
      .delete()
      .eq("photo_id",photoId);

    return{error};
  },

  /* ==========================================================
     COUNTS
  ========================================================== */

  async getPhotoCount(){
    const{count,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*",{count:"exact",head:true});

    return{count:count||0,error};
  },

  async getGalleryPhotoCount(){
    const{count,error}=await db
      .from(TABLES.JOB_PHOTOS)
      .select("*",{count:"exact",head:true})
      .eq("show_in_gallery",true);

    return{count:count||0,error};
  }

};