#include <qapplication.h>
#include "qxinesound.h" 

#define TIMER_EVENT_PLAYBACK_FINISHED   100


QXineSound::QXineSound(QObject *, const char *, QString fileName)
{
 fName = fileName;
 running = false;

 xine = xine_new();
 xine_init(xine);
 
 ao_port = xine_open_audio_driver(xine , "auto", NULL);
 stream = xine_stream_new(xine, ao_port, NULL);
 xine_set_param(stream, XINE_PARAM_IGNORE_VIDEO, 1);

 event_queue = xine_event_new_queue(stream);
 xine_event_create_listener_thread(event_queue, &QXineSound::eventListener, (void*)this);
}

//----------------------------------------------------------------------------------
QXineSound::~QXineSound()
{
 xine_event_dispose_queue(event_queue);
 xine_dispose(stream);
 if(ao_port) xine_close_audio_driver(xine, ao_port);
 xine_exit(xine);
}

//----------------------------------------------------------------------------------
void QXineSound::Play()
{
 start();
}

//----------------------------------------------------------------------------------
void QXineSound::run()
{
	if((xine_open(stream, fName)) && (xine_play(stream, 0, 0)))
	{
		running = true;
		while(running) xine_usec_sleep(20000);
	}
}

//----------------------------------------------------------------------------------
void QXineSound::Stop()
{
	running = false;
	xine_stop(stream);
	xine_close(stream);
}

//----------------------------------------------------------------------------------
bool QXineSound::isPlaying()
{
	return running;
}

//----------------------------------------------------------------------------------
void QXineSound::setName(QString fileName)
{
	fName = fileName ;
}

//----------------------------------------------------------------------------------
int QXineSound::getVolume()
{
 return xine_get_param(stream, XINE_PARAM_AUDIO_AMP_LEVEL);
}

//----------------------------------------------------------------------------------
void QXineSound::setVolume(int val)
{
 xine_set_param(stream, XINE_PARAM_AUDIO_AMP_LEVEL, val);
}

//----------------------------------------------------------------------------------
void QXineSound::setEqualizer(int val30, int val60, int val125, int val250, int val500, 
               int val1k, int val2k, int val4k, int val8k, int val16k)
{
 xine_set_param(stream, XINE_PARAM_EQ_30HZ, val30);
 xine_set_param(stream, XINE_PARAM_EQ_60HZ, val60);
 xine_set_param(stream, XINE_PARAM_EQ_125HZ, val125);
 xine_set_param(stream, XINE_PARAM_EQ_250HZ, val250);
 xine_set_param(stream, XINE_PARAM_EQ_500HZ, val500);
 xine_set_param(stream, XINE_PARAM_EQ_1000HZ, val1k);
 xine_set_param(stream, XINE_PARAM_EQ_2000HZ, val2k);
 xine_set_param(stream, XINE_PARAM_EQ_4000HZ, val4k);
 xine_set_param(stream, XINE_PARAM_EQ_8000HZ, val8k);
 xine_set_param(stream, XINE_PARAM_EQ_16000HZ, val16k); 
}

//----------------------------------------------------------------------------------
void QXineSound::eventListener(void* p, const xine_event_t *xineEvent)
{
 if (p == NULL) return;
 QXineSound *vw = (QXineSound*) p;

 if (xineEvent->type == XINE_EVENT_UI_PLAYBACK_FINISHED) 
 {
  QApplication::postEvent(vw, new QTimerEvent(TIMER_EVENT_PLAYBACK_FINISHED ));
 }

}

//----------------------------------------------------------------------------------
void QXineSound::timerEvent(QTimerEvent *tevent)
{
	if (tevent->timerId() == TIMER_EVENT_PLAYBACK_FINISHED) 
	{
		running = false;
		emit playEnd();
	}
}


