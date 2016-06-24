// Cross correlation implementation originally from https://github.com/dMaggot/libxcorr.
// Modified June 23, 2016 to fix broken code and to increase efficiency

#include "../include/xcorr.h"
#include <string.h>

void xcorr(fftw_complex * signala, fftw_complex * signalb, fftw_complex * result, int N, fftw_plan & fft, fftw_plan & ifft) {
    fftw_complex * signala_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * signalb_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * out_shifted = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * outa = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * outb = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * out = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));

    //zeropadding
    memset (signala_ext, 0, sizeof(fftw_complex) * (N - 1));
    memcpy (signala_ext + (N - 1), signala, sizeof(fftw_complex) * N);
    memcpy (signalb_ext, signalb, sizeof(fftw_complex) * N);
    memset (signalb_ext + N, 0, sizeof(fftw_complex) * (N - 1));

    fftw_execute_dft(fft, signala_ext, outa);
    fftw_execute_dft(fft, signalb_ext, outb);

    // Block modified to fix code
    double scale = 1.0/(2 * N -1);

    std::complex<double> * out_cmplx = reinterpret_cast<std::complex<double> *>(out);
    std::complex<double> * outa_cmplx = reinterpret_cast<std::complex<double> *>(outa);
    std::complex<double> * outb_cmplx = reinterpret_cast<std::complex<double> *>(outb);

    for (int i = 0; i < 2 * N - 1; i++)
        out_cmplx[i] = outa_cmplx[i] * conj(outb_cmplx[i]) * scale;
    // *****

    fftw_execute_dft(ifft, out, result);

    fftw_free(signala_ext);
    fftw_free(signalb_ext);
    fftw_free(out_shifted);
    fftw_free(out);
    fftw_free(outa);
    fftw_free(outb);
}
