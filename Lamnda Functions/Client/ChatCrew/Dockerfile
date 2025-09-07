FROM public.ecr.aws/lambda/python:3.12

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy function code
COPY *.py ./
COPY ./mocks/* ./mocks/
COPY ./prompts/* ./prompts/

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]
