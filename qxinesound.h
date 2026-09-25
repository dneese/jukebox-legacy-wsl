#ifndef QXINESOUND_H_
#define QXINESOUND_H_

#include <xine.h>
#include <xine/xineutils.h>

class QObject;
class QString;
class QTimerEvent;

#include<qstring.h>
#include<qobject.h>
#include<qthread.h>

class Q_EXPORT QXineSound : public QObject, public QThread
{
 Q_OBJECT

	public:
		QXineSound(QObject *parent=0, const char *name=0, QString fileName="");
		~QXineSound(); 
	public slots:
		void Play();
		void Stop();
		void setName(QString fileName);
		bool isPlaying();
		int getVolume();
		void setVolume(int val);
		void setEqualizer( int val30, int val60, int val125, int val250, int val500, 
										 int val1k, int val2k, int val4k, int val8k, int val16k);
	signals:
		void playEnd();
	private:
		virtual void run();
		QString fName;
		bool running;
		xine_t *xine;
		xine_stream_t *stream;
		xine_audio_port_t *ao_port;
		xine_event_queue_t  *event_queue;
		static void eventListener(void* p, const xine_event_t*);
	protected:
		void timerEvent(QTimerEvent*);
};

#endif
