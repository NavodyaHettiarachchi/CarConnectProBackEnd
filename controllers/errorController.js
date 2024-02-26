// Send Dev Errors
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    stack: err.stack,
    showQuickNotification: true,
    message: err.message,
  })
};

// Send Prod Errors
const sendErrorProd = (req, res) => { 
  // Operatiuonal, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    })
    // Programming or other unknown error: dont leak error details to client
  } else { 
    // 1) log error
    console.error('Error 💥: ', err)
    // 2) generate error message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong'
    })
  }
}

module.exports = (err, req, res, next) => { 
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'Error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') { 
    sendErrorProd(err, res);
  }
}
